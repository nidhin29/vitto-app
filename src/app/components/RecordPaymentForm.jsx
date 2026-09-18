"use client";

import React, { useState } from "react";

export default function RecordPaymentForm({ onSubmitPayment }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    setIsSubmitting(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      if (onSubmitPayment) {
        await onSubmitPayment({
          amount: parseFloat(amount),
          date: date || "",
        });
      }
      setSuccessMsg(`Payment of ₹${parseFloat(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })} submitted successfully!`);
      setAmount("");
      setDate("");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg(err.message || "Payment failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs">
      <div className="pb-4 border-b border-slate-100 mb-5">
        <h2 className="text-base md:text-lg font-bold text-slate-900">
          Record payment
        </h2>
        <p className="text-xs md:text-sm text-slate-500 mt-0.5">
          Log a repayment against this loan account.
        </p>
      </div>

      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs md:text-sm rounded-lg flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="font-bold text-emerald-800 ml-2">×</button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs md:text-sm rounded-lg flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="font-bold text-red-800 ml-2">×</button>
        </div>
      )}


      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Payment Amount Field */}
        <div>
          <label htmlFor="payment-amount" className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5">
            Payment amount
          </label>
          <div className="relative rounded-lg border border-slate-300 focus-within:border-[var(--primary-color)] focus-within:ring-1 focus-within:ring-[var(--primary-color)] bg-white">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm">
              ₹
            </div>
            <input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-8 pr-4 py-2.5 text-xs md:text-sm text-slate-900 bg-transparent rounded-lg focus:outline-none placeholder-slate-400"
              required
            />
          </div>
        </div>

        {/* Payment Date Field */}
        <div>
          <label htmlFor="payment-date" className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5">
            Payment date
          </label>
          <div className="relative rounded-lg border border-slate-300 focus-within:border-[var(--primary-color)] focus-within:ring-1 focus-within:ring-[var(--primary-color)] bg-white">
            <input
              id="payment-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ color: date ? "#0f172a" : "#94a3b8" }}
              className="w-full px-3.5 py-2.5 text-xs md:text-sm bg-transparent rounded-lg focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[var(--primary-color)] hover:opacity-90 active:scale-98 text-white font-medium text-xs md:text-sm px-5 py-2.5 rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit payment"}
          </button>
        </div>
      </form>
    </div>
  );
}
