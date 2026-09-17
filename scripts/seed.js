
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function seed() {
  const principal = 200000;
  const rate = 18; // annual %
  const tenureMonths = 24;
  const startDate = new Date("2026-06-01T00:00:00Z");

  const r = rate / 100 / 12;
  const n = tenureMonths;
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  const instalments = [];
  let remainingBalance = principal;

  for (let i = 1; i <= n; i++) {
    const interest = Number((remainingBalance * r).toFixed(2));
    const principalPaid = Number((emi - interest).toFixed(2));
    remainingBalance = Number((remainingBalance - principalPaid).toFixed(2));

    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + (i - 1));

    // Final instalment absorbs rounding remainder
    const isLast = i === n;
    const totalDue = isLast
      ? Number((principalPaid + interest + remainingBalance).toFixed(2))
      : Number((principalPaid + interest).toFixed(2));

    if (isLast) remainingBalance = 0;

    instalments.push({
      sequenceNumber: i,
      principalComponent: principalPaid,
      interestComponent: interest,
      totalDue,
      dueDate,
      paidAmount: 0,
      overdueAmount: 0,
      status: "ACTIVE",
    });
  }

  const loan = await prisma.loan.create({
    data: {
      principal,
      principalBalance: principal,
      rate,
      tenureMonths,
      startDate,
      status: "ACTIVE",
      instalments: { create: instalments },
    },
  });

  console.log(`✅ Loan created: ${loan.id}`);
  console.log(`   Principal: ₹${principal.toLocaleString("en-IN")}  |  Rate: ${rate}%  |  Tenure: ${tenureMonths} months`);
  console.log(`   EMI: ₹${emi.toFixed(2)}`);

  // Write NEXT_PUBLIC_LOAN_ID into .env
  const envPath = path.join(__dirname, "..", ".env");
  let envContent = fs.readFileSync(envPath, "utf8");

  if (envContent.includes("NEXT_PUBLIC_LOAN_ID=")) {
    envContent = envContent.replace(/NEXT_PUBLIC_LOAN_ID=.*/g, `NEXT_PUBLIC_LOAN_ID="${loan.id}"`);
  } else {
    envContent += `\nNEXT_PUBLIC_LOAN_ID="${loan.id}"\n`;
  }

  fs.writeFileSync(envPath, envContent, "utf8");
  console.log(`📝 Written NEXT_PUBLIC_LOAN_ID to .env`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
