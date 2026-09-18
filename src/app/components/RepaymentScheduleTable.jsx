import React from "react";

function StatusBadge({ status }) {
  const normalized = (status || "").toUpperCase();

  let badgeStyle = {
    backgroundColor: "#f1f5f9",
    color: "#475569",
    border: "1px solid #cbd5e1",
  };

  if (normalized === "PAID") {
    badgeStyle = {
      backgroundColor: "#dcfce7",
      color: "#15803d",
      border: "1px solid #86efac",
    };
  } else if (normalized === "ACTIVE") {
    badgeStyle = {
      backgroundColor: "#e0f2fe",
      color: "#0369a1",
      border: "1px solid #7dd3fc",
    };
  } else if (normalized === "OVERDUE") {
    badgeStyle = {
      backgroundColor: "#fee2e2",
      color: "#b91c1c",
      border: "1px solid #fca5a5",
    };
  } else if (normalized === "PARTIALLY_PAID") {
    badgeStyle = {
      backgroundColor: "#fef3c7",
      color: "#b45309",
      border: "1px solid #fcd34d",
    };
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: "9999px",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        ...badgeStyle,
      }}
    >
      {status}
    </span>
  );
}

export default function RepaymentScheduleTable({ schedule = [] }) {
  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const formatDate = (val) => {
    if (!val) return "—";
    const date = new Date(val);
    if (isNaN(date.getTime())) return val;
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const outstanding = schedule
    .filter((i) => i.status !== "PAID" && i.status !== "CLOSED")
    .reduce((sum, i) => sum + (i.totalDue - i.paid), 0);

  const overdue = schedule
    .filter((i) => i.status === "OVERDUE")
    .reduce((sum, i) => sum + (i.overdueAmount || 0), 0);

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
      <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base md:text-lg font-bold text-slate-900">
            Repayment schedule
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            {schedule.length} instalments on this loan.
          </p>
        </div>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "16px",
          padding: "6px 16px",
          borderRadius: "9999px",
          backgroundColor: "#f8fafc",
          border: "1px solid #cbd5e1",
          fontSize: "13px",
          fontWeight: 500,
          color: "#475569",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#64748b" }}>Outstanding:</span>
            <span style={{ fontWeight: 700, color: "#0f172a" }}>₹{formatCurrency(outstanding)}</span>
          </div>
          <div style={{ width: "1px", height: "14px", backgroundColor: "#cbd5e1" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#64748b" }}>Overdue:</span>
            <span style={{ fontWeight: 700, color: overdue > 0 ? "#dc2626" : "#0f172a" }}>
              ₹{formatCurrency(overdue)}
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-semibold text-slate-600 bg-white">
              <th className="py-3.5 px-6 font-semibold">Month</th>
              <th className="py-3.5 px-6 font-semibold">Due date</th>
              <th className="py-3.5 px-6 font-semibold text-right">Principal</th>
              <th className="py-3.5 px-6 font-semibold text-right">Interest</th>
              <th className="py-3.5 px-6 font-semibold text-right">Total due</th>
              <th className="py-3.5 px-6 font-semibold text-right">Paid</th>
              <th className="py-3.5 px-6 font-semibold text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs md:text-sm text-slate-700">
            {schedule.map((item) => (
              <tr
                key={item.month}
                className="hover:bg-slate-50/70 transition-colors"
              >
                <td className="py-4 px-6 font-semibold text-slate-900">
                  {item.month}
                </td>
                <td className="py-4 px-6 text-slate-600 whitespace-nowrap">
                  {formatDate(item.dueDate)}
                </td>
                <td className="py-4 px-6 text-right font-medium text-slate-600">
                  {formatCurrency(item.principal)}
                </td>
                <td className="py-4 px-6 text-right font-medium text-slate-600">
                  {formatCurrency(item.interest)}
                </td>
                <td className="py-4 px-6 text-right font-bold text-slate-900">
                  {formatCurrency(item.totalDue)}
                </td>
                <td className="py-4 px-6 text-right font-medium text-slate-600">
                  {formatCurrency(item.paid)}
                </td>
                <td className="py-4 px-6 text-center whitespace-nowrap">
                  <StatusBadge status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
