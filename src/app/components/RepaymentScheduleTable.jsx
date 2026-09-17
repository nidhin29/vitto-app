import React from "react";

export const PaymentStatus = Object.freeze({
  PAID: "Paid",
  PARTIALLY_PAID: "Partially paid",
  OVERDUE: "Overdue",
  PENDING: "Pending",
});

const STATUS_STYLES = Object.freeze({
  [PaymentStatus.PAID]: "bg-[#e6f4ea] text-[#137333] border-emerald-100",
  [PaymentStatus.PARTIALLY_PAID]: "bg-[#fef7e0] text-[#b06000] border-amber-100",
  [PaymentStatus.OVERDUE]: "bg-[#fce8e6] text-[#c5221f] border-rose-100",
  [PaymentStatus.PENDING]: "bg-[#f1f3f4] text-[#5f6368] border-slate-200",
});

function StatusBadge({ status }) {
  const currentStyle = STATUS_STYLES[status] || STATUS_STYLES[PaymentStatus.PENDING];

  return (
    <span
      className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold border ${currentStyle}`}
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

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-base md:text-lg font-bold text-slate-900">
          Repayment schedule
        </h2>
        <p className="text-xs md:text-sm text-slate-500 mt-0.5">
          {schedule.length} instalments on this loan.
        </p>
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
                  {item.dueDate}
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
