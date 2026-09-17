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

    
    const schedule = loan.instalments.map((inst) => ({
      id: inst.id,
      month: inst.sequenceNumber,
      dueDate: inst.dueDate,
      principal: Number(inst.principalComponent),
      interest: Number(inst.interestComponent),
      totalDue: Number(inst.totalDue),
      paid: Number(inst.paidAmount),
      overdueAmount: Number(inst.overdueAmount),
      status: inst.status,
    }));

    return NextResponse.json(
      {
        loanId: loan.id,
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
