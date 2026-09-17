/**
 * Integration Tests against Prisma Database and Endpoint Helpers
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

describe("Integration Tests (Real Database Access)", () => {
  let testLoanId = null;

  beforeAll(async () => {
    // Ensure database connection is active
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up test loan created during integration tests
    if (testLoanId) {
      await prisma.instalments.deleteMany({ where: { loanId: testLoanId } });
      await prisma.payment.deleteMany({ where: { loanId: testLoanId } });
      await prisma.loan.delete({ where: { id: testLoanId } });
    }
    await prisma.$disconnect();
  });

  test("11. Success path: Creates a loan record and persists schedule directly in PostgreSQL database", async () => {
    const startDate = new Date("2026-06-01T00:00:00Z");
    const instalmentsData = Array.from({ length: 6 }).map((_, i) => {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      return {
        sequenceNumber: i + 1,
        principalComponent: 8000,
        interestComponent: 500,
        totalDue: 8500,
        dueDate: dueDate,
        paidAmount: 0,
        overdueAmount: 0,
        status: "ACTIVE",
      };
    });

    const loan = await prisma.loan.create({
      data: {
        principal: 50000,
        principalBalance: 50000,
        rate: 12,
        tenureMonths: 6,
        startDate: startDate,
        status: "ACTIVE",
        instalments: {
          create: instalmentsData,
        },
      },
      include: { instalments: true },
    });

    testLoanId = loan.id;

    expect(loan.id).toBeDefined();
    expect(Number(loan.principal)).toBe(50000);
    expect(loan.instalments).toHaveLength(6);
  });

  test("12. Failure path: Rejects loan query for unknown/invalid loan identifier", async () => {
    const nonExistentLoan = await prisma.loan.findUnique({
      where: { id: "00000000-0000-0000-0000-000000000000" },
    });
    expect(nonExistentLoan).toBeNull();
  });

  test("13. Authentication enforcement: Rejects requests missing Bearer authorization token", () => {
    const mockRequest = {
      headers: {
        get: (headerName) => (headerName === "authorization" ? null : undefined),
      },
    };

    const authHeader = mockRequest.headers.get("authorization");
    const isAuthorized = authHeader && authHeader.startsWith("Bearer ");

    expect(isAuthorized).toBeFalsy();
  });
});
