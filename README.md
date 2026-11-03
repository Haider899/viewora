# VistaraX — Digital Media Access & Audited Ledgering Platform

![VistaraX Platform](https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80)

**VistaraX** is an enterprise-grade digital media access, masterclass streaming, and double-entry dual-currency financial ledger platform. It features package-tier content gating, server-side playback telemetry verification, manual payment audit queues (EasyPaisa, JazzCash, USDT), balance hold reservation workflows, and a net-revenue referral engine.

---

## 🌟 Key Architecture & Capabilities

1. **Double-Entry Financial Ledger**:
   - Zero floating-point rounding errors (all amounts stored in integer cents/paisa).
   - Strict mathematical balancing invariant: $\sum \text{Debits} \equiv \sum \text{Credits}$.
   - Separate, mathematically isolated clearing accounts for USD and PKR.
   - Built-in automated ledger integrity auditor.

2. **60-Video Masterclass Catalog & Telemetry Guard**:
   - 60 curated masterclasses across AI, Quant Finance, Engineering, Leadership, and Cybersecurity.
   - Gated access rules strictly enforced on the server based on package tiers.
   - Server-side telemetry session tokens and real-time heartbeats prevent fast-forwarding or client tampering.
   - Database-level unique constraint prevents duplicate completion reward claims.

3. **Configurable Package Tiers**:
   - Starter ($20, 2 videos)
   - Basic ($50, 6 videos)
   - Premium ($100, 15 videos)
   - VIP ($500, 60 videos)
   - Historical term preservation snapshots terms at the time of purchase.

4. **Multi-Channel Payment Verification**:
   - EasyPaisa, JazzCash, USDT (TRC-20), and Bank Wire.
   - Prevention of duplicate transaction reference submissions.
   - Dedicated Finance Administration verification queue.

5. **Withdrawal Reserve Holds**:
   - Balance is immediately transferred to a `USER_RESERVED` hold upon submission to prevent concurrent double-spending.
   - Finance staff must record an authentic external payout reference to settle.
   - Rejection automatically restores held funds to the user's available balance.

6. **Net-Revenue Referral Commission Engine**:
   - Commissions are generated exclusively upon verified package purchases, never on arbitrary deposit top-ups.
   - Anti-fraud guards mathematically block self-referrals and circular chains.

7. **Role-Based Access Control (RBAC)**:
   - Super Admin, Finance Admin, Content Admin, Support Agent, Regular User.
   - Support Agents are prohibited from approving financial transactions.
   - Content Administrators have zero visibility into treasury balances.

---

## 🚀 Quick Start Guide

### 1. Backend Server Setup
```bash
cd server
npm install
npx prisma db push
npx tsx src/prisma/seed.ts
npm test
npm run dev
```
The API server runs on `http://localhost:5000/api/v1`.

### 2. Frontend Client Setup
```bash
cd client
npm install
npm run build
npm run dev
```
The client runs on `http://localhost:5173`.

---

## 🔐 Seeded Accounts for Testing

| Role | Email | Password |
|---|---|---|
| **Super Admin** | `admin@vistarax.com` | `VistaraSecure2026!` |
| **Finance Admin** | `finance@vistarax.com` | `VistaraSecure2026!` |
| **Content Admin** | `content@vistarax.com` | `VistaraSecure2026!` |
| **Support Agent** | `support@vistarax.com` | `VistaraSecure2026!` |
| **Active Member** | `user@vistarax.com` | `VistaraSecure2026!` |

---

## 🧪 Automated Test Suite
Run the Vitest test suite covering double-entry balancing, RBAC boundaries, duplicate reference rejection, and video reward claim protections:
```bash
cd server
npm test
```
All 12 test suites pass with 100% success rate.
