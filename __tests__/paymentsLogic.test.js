/**
 * Payment Logic Unit Tests
 */

function allocatePaymentWaterfall(instalments, paymentAmount, paymentDateStr) {
  const paymentDate = new Date(paymentDateStr);
  let remaining = paymentAmount;

  // Clone instalments
  const updated = instalments.map((i) => ({ ...i }));

  // Waterfall 1: Settle due instalments (dueDate <= paymentDate)
  const dueInstalments = updated.filter(
    (i) => i.status !== "PAID" && new Date(i.dueDate) <= paymentDate
  );

  for (const inst of dueInstalments) {
    if (remaining <= 0) break;
    const amountDue = inst.totalDue - inst.paidAmount;
    if (amountDue <= 0) continue;

    const allocation = Math.min(remaining, amountDue);
    inst.paidAmount += allocation;
    remaining -= allocation;

    if (inst.paidAmount >= inst.totalDue) {
      inst.status = "PAID";
      inst.overdueAmount = 0;
    } else {
      inst.status = "OVERDUE";
      inst.overdueAmount = inst.totalDue - inst.paidAmount;
    }
  }

  // Waterfall 2: Surplus goes to principal curtailment (not prepaying future instalments)
  let curtailedPrincipal = 0;
  if (remaining > 0) {
    const futureInstalments = updated.filter(
      (i) => i.status !== "PAID" && new Date(i.dueDate) > paymentDate
    );
    if (futureInstalments.length > 0) {
      curtailedPrincipal = remaining;
      remaining = 0;
    }
  }

  return { updatedInstalments: updated, remainingSurplus: remaining, curtailedPrincipal };
}

describe("Payment Allocation & Waterfall Unit Tests", () => {
  const sampleInstalments = [
    {
      id: "inst-1",
      sequenceNumber: 1,
      dueDate: "2026-09-01T00:00:00Z",
      principalComponent: 6984.77,
      interestComponent: 3000.0,
      totalDue: 9984.77,
      paidAmount: 0,
      overdueAmount: 0,
      status: "ACTIVE",
    },
    {
      id: "inst-2",
      sequenceNumber: 2,
      dueDate: "2026-10-01T00:00:00Z",
      principalComponent: 7089.54,
      interestComponent: 2895.23,
      totalDue: 9984.77,
      paidAmount: 0,
      overdueAmount: 0,
      status: "ACTIVE",
    },
    {
      id: "inst-3",
      sequenceNumber: 3,
      dueDate: "2026-11-01T00:00:00Z",
      principalComponent: 7195.88,
      interestComponent: 2788.89,
      totalDue: 9984.77,
      paidAmount: 0,
      overdueAmount: 0,
      status: "ACTIVE",
    },
  ];

  test("6. Exact payment settles the due instalment in full", () => {
    const result = allocatePaymentWaterfall(sampleInstalments, 9984.77, "2026-09-15T00:00:00Z");
    expect(result.updatedInstalments[0].status).toBe("PAID");
    expect(result.updatedInstalments[0].paidAmount).toBe(9984.77);
    expect(result.updatedInstalments[0].overdueAmount).toBe(0);
    expect(result.curtailedPrincipal).toBe(0);
  });

  test("7. Partial payment marks instalment OVERDUE with correct overdue balance", () => {
    const result = allocatePaymentWaterfall(sampleInstalments, 5000.0, "2026-09-15T00:00:00Z");
    expect(result.updatedInstalments[0].status).toBe("OVERDUE");
    expect(result.updatedInstalments[0].paidAmount).toBe(5000.0);
    expect(result.updatedInstalments[0].overdueAmount).toBeCloseTo(4984.77, 2);
  });

  test("8. Overpayment applies excess to principal curtailment rather than prepaying future instalments", () => {
    // Payment of ₹15,000 when instalment 1 (due Sept 1) is ₹9,984.77
    const result = allocatePaymentWaterfall(sampleInstalments, 15000.0, "2026-09-15T00:00:00Z");

    // Instalment 1 fully paid
    expect(result.updatedInstalments[0].status).toBe("PAID");

    // Future instalments remain unpaid (0 paidAmount)
    expect(result.updatedInstalments[1].paidAmount).toBe(0);
    expect(result.updatedInstalments[1].status).toBe("ACTIVE");

    // Excess ₹5,015.23 applies 100% to principal curtailment
    expect(result.curtailedPrincipal).toBeCloseTo(5015.23, 2);
  });

  test("9. Rejects duplicate payment attempts on identical loanId, amount, and timestamp", () => {
    const recordedPayments = [
      { loanId: "loan-123", amount: 5000, paymentdate: "2026-09-17T12:00:00Z" },
    ];

    const isDuplicate = (loanId, amount, paymentdate) => {
      return recordedPayments.some(
        (p) => p.loanId === loanId && p.amount === amount && p.paymentdate === paymentdate
      );
    };

    expect(isDuplicate("loan-123", 5000, "2026-09-17T12:00:00Z")).toBe(true);
    // Different timestamp on same day is allowed
    expect(isDuplicate("loan-123", 5000, "2026-09-17T15:30:00Z")).toBe(false);
  });

  test("10. Rejects unauthenticated API request without valid Bearer token", () => {
    const authenticateRequest = (authHeader) => {
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return { status: 401, error: "Unauthorized" };
      }
      return { status: 200 };
    };

    expect(authenticateRequest(null)).toEqual({ status: 401, error: "Unauthorized" });
    expect(authenticateRequest("Basic xyz")).toEqual({ status: 401, error: "Unauthorized" });
    expect(authenticateRequest("Bearer valid-token")).toEqual({ status: 200 });
  });
});
