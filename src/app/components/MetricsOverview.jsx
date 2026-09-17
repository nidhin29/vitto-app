import React from "react";

function MetricCard({ title, amount, subtext }) {
  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs hover:shadow-md transition-shadow">
      <h2 className="text-sm font-medium text-slate-600">{title}</h2>
      <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-2 mb-1 tracking-tight">
        ₹ {formatCurrency(amount)}
      </p>
      <span className="text-xs text-slate-400 block">{subtext}</span>
    </div>
  );
}

export default function MetricsOverview({
  outstandingBalance = 193014.0,
  nextDueAmount = 9986.0,
  nextDueDate = "01 Oct 2026",
  overdueAmount = 0.0,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
      <MetricCard
        title="Outstanding principal balance"
        amount={outstandingBalance}
        subtext="Across all active instalments"
      />
      <MetricCard
        title="Next due payment"
        amount={nextDueAmount}
        subtext={`Due ${nextDueDate}`}
      />
      <MetricCard
        title="Overdue amount"
        amount={overdueAmount}
        subtext={
          overdueAmount > 0
            ? "Past due payments require attention"
            : "Nothing past due"
        }
      />
    </div>
  );
}
