"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import Header from "./components/Header";
import RecordPaymentForm from "./components/RecordPaymentForm";
import RepaymentScheduleTable from "./components/RepaymentScheduleTable";
import Image from "next/image";
import logoImg from "./assets/pinwheel_transparent.png";

// ---------------------------------------------------------------------------
// Hardcoded loan ID — the page shows one loan at a time.
// In a production UI you'd pick this from a list; here it's seeded via the API.
// ---------------------------------------------------------------------------
const LOAN_ID = process.env.NEXT_PUBLIC_LOAN_ID || "";

// ---------------------------------------------------------------------------
// Helper: get the Firebase ID token from the currently signed-in user
// ---------------------------------------------------------------------------
async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  return user.getIdToken();
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function fetchSchedule(loanId) {
  const token = await getIdToken();
  const res = await fetch(`/api/loans/${loanId}/schedule`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || "Failed to load schedule");
  }
  return res.json(); // { loanId, totalInstalments, schedule }
}

async function postPayment(loanId, amount, paymentdate) {
  const token = await getIdToken();
  const res = await fetch("/api/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ loanId, amount, paymentdate }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Payment failed");
  return body;
}

// ---------------------------------------------------------------------------
// Login screen
// ---------------------------------------------------------------------------
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (err) {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--primary-color)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: "16px",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        width: "100%",
        maxWidth: "400px",
        padding: "40px",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
           <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-xs overflow-hidden p-1.5">
                    <Image src={logoImg} alt="logo" className="w-full h-full object-contain" />
                  </div>
                  <h1 className="text-md md:text-lg font-bold text-[var(--primary-color)]">
                    Vitto
                  </h1>
                </div>
        </div>

        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a", margin: "4px 0 24px 0" }}>Sign in</h1>

        {error && (
          <div style={{
            marginBottom: "20px", padding: "12px 14px",
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: "8px", color: "#dc2626", fontSize: "13px",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "18px" }}>
            <label htmlFor="login-email" style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: "100%", boxSizing: "border-box",
                border: "1px solid #d1d5db", borderRadius: "8px",
                padding: "10px 14px", fontSize: "14px", color: "#0f172a",
                outline: "none", transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = "#e8454a"}
              onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label htmlFor="login-password" style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%", boxSizing: "border-box",
                border: "1px solid #d1d5db", borderRadius: "8px",
                padding: "10px 14px", fontSize: "14px", color: "#0f172a",
                outline: "none", transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = "#e8454a"}
              onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "11px",
              background: loading ? "#f87171" : "#e8454a",
              color: "white", border: "none", borderRadius: "8px",
              fontSize: "14px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity 0.2s",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------
export default function Home() {
  const [authState, setAuthState] = useState("loading"); // "loading" | "unauthenticated" | "authenticated"
  const [userEmail, setUserEmail] = useState("");

  const [schedule, setSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  // ---- Auth listener ----
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthState("authenticated");
        setUserEmail(user.email || "");
      } else {
        setAuthState("unauthenticated");
        setUserEmail("");
      }
    });
    return () => unsub();
  }, []);

  // ---- Fetch schedule whenever authenticated ----
  const loadSchedule = useCallback(async () => {
    if (!LOAN_ID) {
      setScheduleError("No LOAN_ID configured. Set NEXT_PUBLIC_LOAN_ID in your .env file.");
      return;
    }
    setScheduleLoading(true);
    setScheduleError("");
    try {
      const data = await fetchSchedule(LOAN_ID);
      setSchedule(data.schedule);
    } catch (err) {
      setScheduleError(err.message);
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authState === "authenticated") loadSchedule();
  }, [authState, loadSchedule]);

  // ---- Sign out ----
  const handleLogout = async () => {
    await signOut(auth);
  };

  // ---- Record payment ----
  const handlePaymentSubmit = async ({ amount, date }) => {
    // Build a unique full ISO datetime string for the selected date using the current time of day
    let paymentdate;
    if (date) {
      const now = new Date();
      const timePart = now.toISOString().split("T")[1]; // e.g. "12:34:56.789Z"
      paymentdate = `${date}T${timePart}`;
    } else {
      paymentdate = new Date().toISOString();
    }

    await postPayment(LOAN_ID, amount, paymentdate);
    // Refresh schedule immediately after a successful payment — no manual reload needed
    await loadSchedule();
  };

  // ---- Render states ----
  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-500 text-sm">
        Loading…
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return <LoginPage onLogin={() => setAuthState("authenticated")} />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans antialiased text-slate-900">
      <Header email={userEmail} onLogout={handleLogout} />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error banner */}
        {scheduleError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {scheduleError}
          </div>
        )}

        {/* Loading skeleton */}
        {scheduleLoading && (
          <div className="text-slate-400 text-sm animate-pulse">Loading schedule…</div>
        )}

        {/* Record Payment */}
        <section>
          <RecordPaymentForm onSubmitPayment={handlePaymentSubmit} />
        </section>

        {/* Schedule Table */}
        {!scheduleLoading && schedule.length > 0 && (
          <section>
            <RepaymentScheduleTable schedule={schedule} />
          </section>
        )}
      </main>
    </div>
  );
}
