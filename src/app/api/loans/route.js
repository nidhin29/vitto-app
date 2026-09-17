import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminAuth } from "@/lib/firebaseAdmin";



// POST /api/loans - Create new loan and generate instalment schedule
export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    await adminAuth.verifyIdToken(token);

    const { principal, rate, tenureMonths, startDate } = await req.json();

    if (rate <= 0 || tenureMonths <= 0 || principal <= 0) {
      return NextResponse.json(
        { error: "Invalid loan parameters" },
        { status: 400 }
      );
    }

    const r = rate / 100 / 12;
    const n = tenureMonths;
    const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    const instalments = [];
    let remainingBalance = principal;
    const start = new Date(startDate);

    for (let i = 1; i <= n; i++) {
      const interest = remainingBalance * r;
      const principalPaid = emi - interest;
      remainingBalance -= principalPaid;

      const dueDate = new Date(start);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));

      let totalDue = emi;
      if (i === n) {
        totalDue = emi + remainingBalance;
      }

      instalments.push({
        sequenceNumber: i,
        principalComponent: Number(principalPaid.toFixed(2)),
        interestComponent: Number(interest.toFixed(2)),
        totalDue: Number(totalDue.toFixed(2)),
        dueDate: dueDate,
        paidAmount: 0,
        overdueAmount: 0,
        status: "ACTIVE",
      });
    }

    const loan = await prisma.loan.create({
      data: {
        principal,
        principalBalance: principal, // starts equal to principal; reduced by curtailment overpayments
        rate,
        tenureMonths,
        startDate: new Date(startDate),
        status: "ACTIVE",
        instalments: {
          create: instalments,
        },
      },
      include: {
        instalments: {
          orderBy: { sequenceNumber: "asc" },
        },
      },
    });

    return NextResponse.json({ loan }, { status: 201 });
  } catch (error) {
    console.error("Error creating loan:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}