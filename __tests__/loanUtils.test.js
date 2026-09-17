const { calculateEmi, generateSchedule, isValidIsoDateTime } = require("../src/lib/loanUtils");

describe("Loan Schedule & EMI Calculation Unit Tests", () => {
  test("1. Calculates correct monthly EMI for reference loan (₹2,00,000 @ 18% / 24 months)", () => {
    const emi = calculateEmi(200000, 18, 24);
    // EMI formula: P * r * (1+r)^n / ((1+r)^n - 1) = 9984.82
    expect(emi).toBe(9984.82);
  });

  test("2. Generates exactly 24 instalments for a 24-month loan", () => {
    const schedule = generateSchedule(200000, 18, 24, "2026-09-17T00:00:00Z");
    expect(schedule).toHaveLength(24);
    expect(schedule[0].sequenceNumber).toBe(1);
    expect(schedule[23].sequenceNumber).toBe(24);
  });

  test("3. Total principal paid across instalments equals loan principal", () => {
    const schedule = generateSchedule(200000, 18, 24, "2026-09-17T00:00:00Z");
    const totalPrincipal = schedule.reduce((sum, inst) => sum + inst.principalComponent, 0);
    // Allowing minor rounding margin (within ₹1.00)
    expect(Math.abs(totalPrincipal - 200000)).toBeLessThan(1.0);
  });

  test("4. Returns 0 EMI for invalid inputs (principal <= 0 or rate <= 0)", () => {
    expect(calculateEmi(-100, 18, 24)).toBe(0);
    expect(calculateEmi(200000, 0, 24)).toBe(0);
    expect(calculateEmi(200000, 18, 0)).toBe(0);
  });

  test("5. Validates ISO 8601 full datetime format string correctly", () => {
    expect(isValidIsoDateTime("2026-09-17T12:00:00Z")).toBe(true);
    expect(isValidIsoDateTime("2026-09-17T10:30:45.123Z")).toBe(true);
    // Reject date-only strings without time component
    expect(isValidIsoDateTime("2026-09-17")).toBe(false);
    expect(isValidIsoDateTime("invalid-date")).toBe(false);
    expect(isValidIsoDateTime(null)).toBe(false);
  });
});
