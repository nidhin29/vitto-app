import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminAuth } from "@/lib/firebaseAdmin";



export async function GET(req, context) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    await adminAuth.verifyIdToken(token);

    const { loanId } = await context.params;

    if (!loanId) {
      return NextResponse.json(
        { error: "Loan ID is required" },
        { status: 400 }
      );
    }

   
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        instalments: {
          orderBy: { sequenceNumber: "asc" },
        },
      },
    });

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    
    const now = new Date();

    const schedule = loan.instalments.map((inst) => {
      const totalDue = Number(inst.totalDue);
      const paid = Number(inst.paidAmount);
      const dueDate = new Date(inst.dueDate);
      const isPastDue = dueDate < now;

      let effectiveStatus = inst.status;
      let effectiveOverdue = Number(inst.overdueAmount);

      if (inst.status !== "PAID" && inst.status !== "CLOSED") {
        if (isPastDue) {
          effectiveStatus = "OVERDUE";
          effectiveOverdue = Number((totalDue - paid).toFixed(2));
        } else if (paid > 0 && paid < totalDue) {
          effectiveStatus = "PARTIALLY_PAID";
          effectiveOverdue = 0;
        }
      }

      return {
        id: inst.id,
        month: inst.sequenceNumber,
        dueDate: inst.dueDate,
        principal: Number(inst.principalComponent),
        interest: Number(inst.interestComponent),
        totalDue,
        paid,
        overdueAmount: effectiveOverdue,
        status: effectiveStatus,
      };
    });

    // Compute current position metrics dynamically as of today
    const unpaidInstalments = schedule.filter(
      (inst) => inst.status !== "PAID" && inst.status !== "CLOSED"
    );

    const outstandingPrincipal = Number(loan.principalBalance);
    const overdueAmount = schedule
      .filter((inst) => inst.status === "OVERDUE")
      .reduce((sum, inst) => sum + inst.overdueAmount, 0);

    const nextInstalment = unpaidInstalments[0] || null;
    const nextDueDate = nextInstalment ? nextInstalment.dueDate : null;
    const nextDueAmount = nextInstalment
      ? Number((nextInstalment.totalDue - nextInstalment.paid).toFixed(2))
      : 0;

    return NextResponse.json(
      {
        loanId: loan.id,
        currentPosition: {
          outstandingPrincipal,
          nextDueDate,
          nextDueAmount,
          overdueAmount: Number(overdueAmount.toFixed(2)),
        },
        totalInstalments: schedule.length,
        schedule: schedule,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching repayment schedule:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
