# VistaraX Platform — Architecture and Project Specification

## 1. Executive Summary & Architecture Overview

**VistaraX** is an enterprise-grade digital media access, content engagement, and dual-currency digital wallet platform. It combines content library management (video catalog with access-tier gates and engagement verification), dual-currency financial ledgering (USD & PKR), manual payment settlement workflows (EasyPaisa, JazzCash, Crypto/manual transfers), withdrawal management with reserve holds, a commission-traceable referral system, and a comprehensive Role-Based Access Control (RBAC) administrative dashboard.

### Core Architectural Principles
- **Double-Entry Financial Ledger**: Immutable financial transaction ledger where every entry has balancing debits and credits ($Total\ Debits = Total\ Credits$). No balance field is ever mutated directly.
- **Strict Concurrency & Idempotency**: Financial requests (deposits, purchases, withdrawal holds) require idempotency keys and database transaction atomicity.
- **Zero Floating-Point Drift**: Monetary values are stored and calculated in minor currency units (integer cents/paisa: 1 USD = 100 cents, 1 PKR = 100 paisa) or exact decimal representations, preventing IEEE-754 precision loss.
- **Server-Side Verification**: Client submissions (video watch progress, reward claims, payment references) are never trusted blindly; claims are evaluated against cryptographically or server-verified session boundaries.
- **Dual Currency Isolation**: Separate wallet accounts for USD and PKR with no accidental co-mingling. Conversions require authorized exchange rate records.
- **Compliance & Ethical Guardrails**: No Ponzi/HYIP mechanics. No guaranteed investment yields, no speculative daily percentage returns on deposits. Rewards and commissions require explicit revenue-event linkage and configurable, authorized rules.

---

## 2. Technology Stack & Workspace Constraints

| Layer | Selected Technology | Rationale & Configuration |
|---|---|---|
| **Frontend Framework** | React 18, Vite, TypeScript | High performance, rapid HMR, strict type safety |
| **Styling & UI Components** | Tailwind CSS, Lucide React, Custom Accessible UI components | Modern SaaS aesthetic (Navy/Emerald theme), fully responsive, dark/light contrast |
| **Backend Framework** | Node.js (v24), Express.js, TypeScript | Enterprise routing, asynchronous I/O, modular controller-service-repository structure |
| **Data Layer & ORM** | Prisma ORM | Type-safe queries, migration management, relational integrity |
| **Database Engine** | SQLite (Dev/Test zero-dependency runtime) / PostgreSQL (Production target) | Accommodates Windows development environment without external daemon while providing full PostgreSQL migration compatibility |
| **Validation & Schemas** | Zod | Runtime request parsing and strict payload validation |
| **Authentication & Security** | JWT (access/refresh), bcryptjs password hashing, RBAC middleware | Stateless authentication with revocable session tokens, role authorization |
| **Testing Suite** | Vitest, Supertest | Unit, ledger invariant, and API integration testing |

---

## 3. Role-Based Access Control (RBAC)

The system enforces 5 distinct roles at the routing and service layer:

1. **Super Admin (`SUPER_ADMIN`)**: Unrestricted administrative authority, system configuration, audit log viewer, role assignments, emergency maintenance toggles.
2. **Finance Admin (`FINANCE_ADMIN`)**: Payment verification queue, withdrawal reviews, ledger reconciliation, exchange rate adjustments, financial export reports.
3. **Content Admin (`CONTENT_ADMIN`)**: Video catalog curation, package assignment, metadata updates, streaming URL configuration. *No access to financial ledger or transaction approval.*
4. **Support Agent (`SUPPORT_AGENT`)**: User account lookup, ticket responses, viewing logs. *Read-only on transactions; strictly prohibited from approving deposits or payouts.*
5. **Regular User (`USER`)**: Video library browsing, streaming eligible content, package purchasing, wallet viewing, deposit/withdrawal requests, referral tracking.

---

## 4. Package & Video Library System

### 4.1 Configurable Package Tiers
Initial system configuration (fully modifiable via admin dashboard):
- **Starter**: $20.00 (2,000 cents), Access limit: 2 videos
- **Basic**: $50.00 (5,000 cents), Access limit: 6 videos
- **Premium**: $100.00 (10,000 cents), Access limit: 15 videos
- **VIP**: $500.00 (50,000 cents), Access limit: 60 videos

### 4.2 Video Catalog & Session Verification
- Supports up to 60+ modular videos with title, description, category, duration, video streaming URL, thumbnail, publication status, and minimum tier level.
- **Session Tracking**: When a user begins watching, the backend creates a `VideoSession` with a nonce and timestamp. Periodic heartbeats validate genuine engagement.
- **Reward Claims**: Reward claims check against maximum reward caps per package and verify that the video session meets playback duration criteria.

---

## 5. Dual-Currency Wallet & Double-Entry Ledger

### 5.1 Wallet Accounts
Every user possesses separate wallet accounts:
- `USER_WALLET_USD` (Available Balance & Reserved Balance)
- `USER_WALLET_PKR` (Available Balance & Reserved Balance)
System accounts maintain double-entry parity:
- `SYSTEM_CASH_EASYPAISA`
- `SYSTEM_CASH_JAZZCASH`
- `SYSTEM_CASH_CRYPTO`
- `SYSTEM_REVENUE_PACKAGES`
- `SYSTEM_EXPENSE_REWARDS`
- `SYSTEM_EXPENSE_REFERRALS`
- `SYSTEM_PAYOUT_PENDING`

### 5.2 Double-Entry Ledger Equations
For every transaction:
$$\sum \text{Debits} = \sum \text{Credits}$$
- **Deposit Approval**:
  - Debit: `SYSTEM_CASH_*` (Asset increases)
  - Credit: `USER_WALLET_*` (Liability to user increases)
- **Package Purchase**:
  - Debit: `USER_WALLET_*` (Liability decreases)
  - Credit: `SYSTEM_REVENUE_PACKAGES` (Revenue recognized)
- **Withdrawal Request**:
  - User Available Balance decreases; Reserved Balance increases (Hold).
- **Withdrawal Completion**:
  - Debit: `USER_WALLET_*` (Reserved balance debited)
  - Credit: `SYSTEM_CASH_*` (Cash sent out)
- **Withdrawal Rejection/Cancellation**:
  - Reserved Balance returns to Available Balance.

---

## 6. Manual & Crypto Payment Workflows

1. **Deposit Request Submission**: User chooses currency and payment method (`EASYPAISA`, `JAZZCASH`, `CRYPTO_USDT`), enters amount and unique transaction reference / transaction hash.
2. **Pending Queue**: Request enters `PENDING` state with screenshot/proof notes.
3. **Finance Verification**: Finance Admin verifies bank/chain records. Upon approval, an atomic ledger transaction posts credit to the user's wallet.
4. **Rejection Safeguards**: Rejected requests log a mandatory audit reason.

---

## 7. Withdrawal Management

1. **Submission**: User requests payout (PKR via EasyPaisa/JazzCash or USD via Crypto).
2. **Balance Hold**: System verifies `Available Balance >= Amount` and immediately places funds in `RESERVED` hold to prevent double-spending.
3. **Review Lifecycle**:
   - `PENDING` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `APPROVED` $\rightarrow$ `PROCESSING` $\rightarrow$ `COMPLETED`
   - If `REJECTED` or `CANCELLED`: hold is released and returned to available balance.
4. **Audit Trail**: Every state change records administrator ID, timestamp, and payout receipt reference.

---

## 8. Referral & Commission Engine

- Each user has a unique referral code and sharable invitation link.
- Commission is only generated upon **verified eligible package purchases** (net revenue events), never on pure deposits.
- Prevent self-referral, circular referrals, and duplicate credit postings.
- Commission percentages are admin-configurable with an emergency kill-switch (`commissions_enabled: false`).

---

## 9. API Contracts & Response Standards

Standard API format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "meta": { "page": 1, "total": 42 }
}
```
Error format:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Available balance of 1500 cents is insufficient for requested 2000 cents hold."
  }
}
```

---

## 10. Security & Quality Assurance Standards

- **Input Validation**: 100% of request payloads sanitized and validated with Zod.
- **SQL & Injection Defense**: Parameterized queries via Prisma.
- **Rate Limiting**: Express rate limiters on `/api/v1/auth/*` and financial endpoints.
- **HTTP Headers**: Helmet security headers, CORS origin restrictions, secure cookies.
- **Automated Tests**: Vitest test coverage on ledger balancing, concurrent withdrawals, duplicate reward mitigation, and RBAC authorization.
