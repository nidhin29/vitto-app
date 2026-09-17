import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function POST(req) {
  try {
    
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    await adminAuth.verifyIdToken(token);

    
    const body = await req.json();
    const { loanId, amount, paymentdate } = body;

    if (!loanId || amount === undefined || !paymentdate) {
      return NextResponse.json(
        { error: "loanId, amount, and paymentdate are required." },
        { status: 400 }
      );
    }

    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be a positive number." },
        { status: 400 }
      );
    }

    // Enforce full ISO 8601 datetime string (e.g. "2026-09-17T10:30:00Z")
    // This ensures two payments on the same day at different times are treated as distinct records.
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    if (!isoRegex.test(paymentdate)) {
      return NextResponse.json(
        { error: "paymentdate must be a full ISO 8601 datetime string (e.g. 2026-09-17T10:30:00Z). A date-only string is not accepted." },
        { status: 400 }
      );
    }

    const parsedPaymentDate = new Date(paymentdate);
    if (isNaN(parsedPaymentDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid payment date." },
        { status: 400 }
      );
    }

    
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan) {
      return NextResponse.json({ error: "Loan not found." }, { status: 404 });
    }

    // Check for duplicate submissions 
    // We match on loanId + amount + full datetime (to the second).
    // Two payments of the same amount on the same day at DIFFERENT times are allowed.
    // Two requests with the exact same timestamp and amount are rejected as duplicates.
    const existingPayment = await prisma.payment.findFirst({
      where: {
        loanId,
        amount: paymentAmount,
        paymentdate: parsedPaymentDate,
      },
    });

    if (existingPayment) {
      return NextResponse.json(
        { error: "Duplicate payment detected. This payment was already recorded." },
        { status: 409 }
      );
    }


    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          loanId,
          amount: paymentAmount,
          paymentdate: parsedPaymentDate,
        },
      });

      // Fetch ALL instalments for this loan, ordered by sequence number
      const allInstalments = await tx.instalments.findMany({
        where: { loanId },
        orderBy: { sequenceNumber: "asc" },
      });

      // Waterfall Step 1: Identify instalments that are "due" as of paymentDate.
      // These are instalments whose dueDate <= parsedPaymentDate and are not yet fully settled.
      // Past-due and current instalments are treated identically — both must be settled first.
      const dueInstalments = allInstalments.filter(
        (inst) =>
          inst.status !== "PAID" &&
          inst.status !== "CLOSED" &&
          new Date(inst.dueDate) <= parsedPaymentDate
      );

      // Future instalments (dueDate > paymentDate) will NOT receive direct prepayment.
      // Overpayment surplus goes to principal curtailment instead.
      const hasFutureInstalments = allInstalments.some(
        (inst) =>
          inst.status !== "PAID" &&
          inst.status !== "CLOSED" &&
          new Date(inst.dueDate) > parsedPaymentDate
      );

      let remainingPayment = paymentAmount;

      // Waterfall Step 1: Settle all due (past-due + current) instalments in sequence order.
      // Allocation order within each instalment: interest first, then principal (standard amortisation).
      for (const inst of dueInstalments) {
        if (remainingPayment <= 0) break;

        const totalDue = Number(inst.totalDue);
        const alreadyPaid = Number(inst.paidAmount);
        const amountDue = Number((totalDue - alreadyPaid).toFixed(2));

        if (amountDue <= 0) continue;

        const allocation = Math.min(remainingPayment, amountDue);
        const newPaidAmount = Number((alreadyPaid + allocation).toFixed(2));

        let newStatus;
        let newOverdueAmount = 0;

        if (newPaidAmount >= totalDue) {
          newStatus = "PAID";
          newOverdueAmount = 0;
        } else if (parsedPaymentDate > new Date(inst.dueDate)) {
          newStatus = "OVERDUE";
          newOverdueAmount = Number((totalDue - newPaidAmount).toFixed(2));
        } else {
          newStatus = "PARTIALLY_PAID";
          newOverdueAmount = 0;
        }

        await tx.instalments.update({
          where: { id: inst.id },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus,
            overdueAmount: newOverdueAmount,
          },
        });

        remainingPayment = Number((remainingPayment - allocation).toFixed(2));
      }

      // Waterfall Step 2: Principal Curtailment + Re-amortisation 
      // If funds remain after all due instalments are settled AND future instalments exist:
      //   a) Reduce loan.principalBalance by the surplus.
      //   b) Delete all future (unpaid) instalment rows.
      //   c) Recalculate a fresh amortisation schedule using the new principalBalance,
      //      the same annual rate, and the same remaining tenure (count of future slots).
      //      Each recalculated instalment inherits its original dueDate and sequenceNumber.
      if (remainingPayment > 0) {
        // Collect future instalments (not yet due as of paymentDate, not PAID/CLOSED)
        const futureInstalments = allInstalments.filter(
          (inst) =>
            inst.status !== "PAID" &&
            inst.status !== "CLOSED" &&
            new Date(inst.dueDate) > parsedPaymentDate
        );

        if (futureInstalments.length > 0) {
          // a) Reduce principalBalance
          const currentLoan = await tx.loan.findUnique({ where: { id: loanId } });
          const currentBalance = Number(currentLoan.principalBalance);
          const newPrincipalBalance = Number(
            Math.max(0, currentBalance - remainingPayment).toFixed(2)
          );

          await tx.loan.update({
            where: { id: loanId },
            data: { principalBalance: newPrincipalBalance },
          });

          // b) Delete existing future instalment rows
          await tx.instalments.deleteMany({
            where: {
              id: { in: futureInstalments.map((i) => i.id) },
            },
          });

          // c) Re-amortise over the remaining tenure using the new principalBalance.
          //    Rate is the original annual rate from the loan (r = annual_rate / 100 / 12).
          const r = Number(currentLoan.rate) / 100 / 12;
          const n = futureInstalments.length;
          const P = newPrincipalBalance;

          // Recalculate EMI with the new principal
          const emi = P > 0 && n > 0
            ? (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
            : 0;

          let remainingBalance = P;
          const newInstalments = [];

          for (let i = 0; i < n; i++) {
            const inst = futureInstalments[i];
            const interestComponent = Number((remainingBalance * r).toFixed(2));
            const principalComponent = Number((emi - interestComponent).toFixed(2));
            remainingBalance = Number((remainingBalance - principalComponent).toFixed(2));

            // On the final instalment, absorb any rounding remainder
            const isLast = i === n - 1;
            const totalDue = isLast
              ? Number((principalComponent + interestComponent + remainingBalance).toFixed(2))
              : Number((principalComponent + interestComponent).toFixed(2));

            if (isLast) remainingBalance = 0;

            newInstalments.push({
              loanId,
              sequenceNumber: inst.sequenceNumber,
              dueDate: inst.dueDate, 
              principalComponent,
              interestComponent,
              totalDue,
              paidAmount: 0,
              overdueAmount: 0,
              status: "ACTIVE",
            });
          }

          await tx.instalments.createMany({ data: newInstalments });

          remainingPayment = 0;
        }
      }

      return payment;
    });



    // 6. Return success
    return NextResponse.json(
      { message: "Payment recorded successfully", payment: result },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
