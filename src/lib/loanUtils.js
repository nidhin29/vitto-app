

function calculateEmi(principal, annualRate, tenureMonths) {
  if (principal <= 0 || annualRate <= 0 || tenureMonths <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = tenureMonths;
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Number(emi.toFixed(2));
}

function generateSchedule(principal, annualRate, tenureMonths, startDateStr) {
  const r = annualRate / 100 / 12;
  const n = tenureMonths;
  const rawEmi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  const instalments = [];
  let remainingBalance = principal;
  const start = new Date(startDateStr);

  for (let i = 1; i <= n; i++) {
    const interest = remainingBalance * r;
    const principalPaid = rawEmi - interest;
    remainingBalance -= principalPaid;

    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + (i - 1));

    let totalDue = rawEmi;
    if (i === n) {
      totalDue = rawEmi + remainingBalance;
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

  return instalments;
}

function isValidIsoDateTime(dateTimeStr) {
  if (!dateTimeStr || typeof dateTimeStr !== "string") return false;
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  if (!isoRegex.test(dateTimeStr)) return false;
  const date = new Date(dateTimeStr);
  return !isNaN(date.getTime());
}

module.exports = {
  calculateEmi,
  generateSchedule,
  isValidIsoDateTime,
};
