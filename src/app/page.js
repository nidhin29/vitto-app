"use client";

import React, { useState } from "react";
import Header from "./components/Header";
import MetricsOverview from "./components/MetricsOverview";
import RecordPaymentForm from "./components/RecordPaymentForm";
import RepaymentScheduleTable, {
  PaymentStatus,
} from "./components/RepaymentScheduleTable";

const initialSchedule = [
  {
    month: 1,
    dueDate: "01 Jun 2026",
    principal: 9186.0,
    interest: 800.0,
    totalDue: 9986.0,
    paid: 9186.0 + 800.0,
    status: PaymentStatus.PAID,
  },
  {
    month: 2,
    dueDate: "01 Jul 2026",
    principal: 9224.0,
    interest: 762.0,
    totalDue: 9986.0,
    paid: 9224.0 + 762.0,
    status: PaymentStatus.PAID,
  },
  {
    month: 3,
    dueDate: "01 Aug 2026",
    principal: 9262.0,
    interest: 724.0,
    totalDue: 9986.0,
    paid: 5000.0,
    status: PaymentStatus.PARTIALLY_PAID,
  },
  {
    month: 4,
    dueDate: "01 Sept 2026",
    principal: 9301.0,
    interest: 685.0,
    totalDue: 9986.0,
    paid: 0.0,
    status: PaymentStatus.OVERDUE,
  },
  {
    month: 5,
    dueDate: "01 Oct 2026",
    principal: 9340.0,
    interest: 646.0,
    totalDue: 9986.0,
    paid: 0.0,
    status: PaymentStatus.PENDING,
  },
  {
    month: 6,
    dueDate: "01 Nov 2026",
    principal: 9379.0,
    interest: 607.0,
    totalDue: 9986.0,
    paid: 0.0,
    status: PaymentStatus.PENDING,
  },
];

export default function Home() {
  const [schedule, setSchedule] = useState(initialSchedule);
  const [outstandingBalance, setOutstandingBalance] = useState(193014.0);
  const [overdueAmount, setOverdueAmount] = useState(0.0);

  const handleLogout = () => {
    alert("Logged out successfully");
  };

  const handlePaymentSubmit = ({ amount }) => {
    let remainingPayment = amount;

    setSchedule((prevSchedule) => {
      const newSchedule = prevSchedule.map((item) => ({ ...item }));

      for (let i = 0; i < newSchedule.length; i++) {
        if (remainingPayment <= 0) break;

        const due = newSchedule[i].totalDue - newSchedule[i].paid;
        if (due > 0) {
          const paymentForThisMonth = Math.min(remainingPayment, due);
          newSchedule[i].paid += paymentForThisMonth;
          remainingPayment -= paymentForThisMonth;

          if (newSchedule[i].paid >= newSchedule[i].totalDue) {
            newSchedule[i].status = PaymentStatus.PAID;
          } else {
            newSchedule[i].status = PaymentStatus.PARTIALLY_PAID;
          }
        }
      }
      return newSchedule;
    });

    setOutstandingBalance((prev) => Math.max(0, prev - amount));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans antialiased text-slate-900">
      {/* Navbar Header */}
      <Header email="test@vitto.in" onLogout={handleLogout} />

      {/* Main Content Dashboard Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Metric Overview Cards */}
        <section>
          <MetricsOverview
            outstandingBalance={outstandingBalance}
            nextDueAmount={9986.0}
            nextDueDate="01 Oct 2026"
            overdueAmount={overdueAmount}
          />
        </section>

        {/* Record Payment Form */}
        <section>
          <RecordPaymentForm onSubmitPayment={handlePaymentSubmit} />
        </section>

        {/* Repayment Schedule Table */}
        <section>
          <RepaymentScheduleTable schedule={schedule} />
        </section>
      </main>
    </div>
  );
}
