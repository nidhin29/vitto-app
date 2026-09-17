# Vitto Loan Repayment Service

A robust, enterprise-grade Micro, Small, and Medium Enterprises (MSME) loan repayment management system built with Next.js 16, PostgreSQL, Prisma ORM, and Firebase Authentication.

---

## Features

- **Loan Schedule Generation**: Instant amortisation schedule calculation using standard EMI formulas.
- **Waterfall Payment Allocation**: Strictly settles due and past-due instalments before handling surplus. Within each instalment, interest is settled first, followed by principal.
- **Principal Curtailment & Re-amortisation**: Overpayments directly reduce the loan's overall `principalBalance` and dynamically re-amortise remaining future instalments without changing due dates or sequence numbers.
- **Concurrency & Precision Safety**: All payment operations run inside atomic Prisma `$transaction` blocks using `@db.Decimal(12,2)` precision to eliminate floating-point inaccuracies.
- **Idempotency & Duplicate Guards**: Rejects duplicate payment attempts matching `(loanId, amount, paymentdate)`. Full ISO 8601 datetimes (`YYYY-MM-DDTHH:mm:ssZ`) are enforced so multiple payments on the same day at different times are correctly supported.
- **Firebase Auth Security**: Server-side authentication check using Firebase Admin SDK on all REST API endpoints.
- **Interactive Dashboard**: Modern Next.js UI featuring login, loan summary metrics, payment recording, and interactive schedule inspection.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: JavaScript (ES6+ / Node.js)
- **Database**: PostgreSQL (via Prisma ORM v6)
- **Authentication**: Firebase Authentication (Client SDK + Admin SDK)
- **Styling**: Tailwind CSS v4 & custom design tokens
- **Testing**: Jest unit and integration test suite

---

## Getting Started

### 1. Prerequisites

- **Node.js**: v18.x or higher
- **PostgreSQL**: Local or hosted instance (e.g. `localhost:5433`)

### 2. Environment Setup

Copy `.env.example` to `.env` and fill in your PostgreSQL connection string and Firebase credentials:

```bash
cp .env.example .env
```

### 3. Database Migration & Schema Push

Push the Prisma schema to set up your PostgreSQL database tables (`Loan`, `Instalments`, `Payment`):

```bash
npx prisma db push
```

### 4. Seed Reference Loan Data

Seed a reference loan (₹2,00,000 at 18% annual interest for 24 months):

```bash
node scripts/seed.js
```

*(Note: `seed.js` automatically creates the reference loan in PostgreSQL and updates `NEXT_PUBLIC_LOAN_ID` in your `.env` file).*

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Tests

Run the complete unit and integration test suite (13 tests across 3 test suites) using Jest:

```bash
npm test
```

Test suite covers:
1. EMI calculation formula accuracy (Reference EMI = ₹9,984.82)
2. Complete 24-month schedule generation
3. Total principal sum verification across schedule
4. Parameter validation safeguards
5. ISO 8601 datetime parser & format enforcer
6. Single instalment exact payment waterfall
7. Underpayment handling & `OVERDUE` balance status
8. Overpayment surplus principal curtailment & re-amortisation
9. Duplicate payment submission detection
10. Firebase Auth Bearer token security guard
11. **Integration Test (Success Path)**: Creates loan record & persists schedule in PostgreSQL via Prisma.
12. **Integration Test (Failure Path)**: Rejects loan query for unknown/invalid loan identifier.
13. **Integration Test (Auth Guard)**: Rejects requests missing Bearer authorization token.

---

## API Endpoint Reference

All requests must include a valid Firebase ID token in the `Authorization` header: `Authorization: Bearer <ID_TOKEN>`.

### 1. `POST /api/loans`
Creates a new loan and generates its initial amortisation schedule.

**Request Body:**
```json
{
  "principal": 200000,
  "rate": 18,
  "tenureMonths": 24,
  "startDate": "2026-09-17T00:00:00Z"
}
```

### 2. `GET /api/loans/[loanId]/schedule`
Retrieves current position metrics and complete repayment schedule.

**Response Body:**
```json
{
  "loanId": "ccfae9f1-5332-46e5-9f0b-13fd64d59ce6",
  "currentPosition": {
    "outstandingPrincipal": 200000,
    "nextDueDate": "2026-06-01T00:00:00.000Z",
    "nextDueAmount": 9984.82,
    "overdueAmount": 0
  },
  "totalInstalments": 24,
  "schedule": [...]
}
```

### 3. `POST /api/payments`
Records a payment and applies allocation waterfall & principal curtailment re-amortisation.

**Request Body:**
```json
{
  "loanId": "ccfae9f1-5332-46e5-9f0b-13fd64d59ce6",
  "amount": 15000,
  "paymentdate": "2026-09-17T12:00:00Z"
}
```

---

## Key Design & Architecture Decisions

1. **Decimal Precision**: All currency values in Prisma schema use `@db.Decimal(12, 2)` to prevent JavaScript double-precision floating point rounding errors.
2. **Waterfall Allocation**:
   - Step 1: Satisfy current/past-due instalments chronologically (`dueDate <= paymentdate`). Interest component is satisfied before principal component.
   - Step 2: Overpayment surplus is NOT applied to prepay future instalments directly. Instead, 100% of excess funds reduce `Loan.principalBalance`.
3. **Dynamic Re-amortisation**:
   - When principal curtailment occurs, remaining future instalments are deleted and recreated with updated EMIs based on the reduced `principalBalance`, preserving original due dates and sequence numbers.
4. **Idempotency**: Duplicate payment requests matching exact `(loanId, amount, paymentdate)` return HTTP 409 Conflict to protect against accidental double charges.
