# VistaraX REST API Documentation

Base URL: `http://localhost:5000/api/v1`

All responses follow the standard JSON envelope:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

---

## 1. Authentication Endpoints

### `POST /auth/register`
Creates a new user account with dedicated USD and PKR wallet accounts.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!",
    "fullName": "Jane Doe",
    "phone": "+923001234567",
    "referralCode": "VX-SUPER"
  }
  ```
- **Response**: User object and JWT access token.

### `POST /auth/login`
Authenticates credentials and generates JWT token.
- **Request Body**:
  ```json
  {
    "email": "admin@vistarax.com",
    "password": "VistaraSecure2026!"
  }
  ```

### `GET /auth/me`
Returns authenticated profile and role. (Requires `Bearer <token>`).

---

## 2. Package Management

### `GET /packages`
Public endpoint returning active curriculum packages (`Starter`, `Basic`, `Premium`, `VIP`).

### `POST /packages/purchase`
Purchases package using authenticated user's wallet available balance.
- **Header**: `Authorization: Bearer <token>`
- **Request Body**: `{ "packageId": "uuid" }`
- **Ledger Impact**: Debits `USER_AVAILABLE`, Credits `SYSTEM_REVENUE_PACKAGES`. Creates immutable historical snapshot and initiates referral commission calculation.

---

## 3. Video Streaming & Telemetry

### `GET /videos`
Returns the 60-video catalog with access status evaluated against active package limit.

### `POST /videos/:id/session`
Initiates a server-verified playback session.
- **Response**: `{ "sessionToken": "hex-token" }`

### `POST /videos/:id/heartbeat`
Telemetry heartbeat reporting elapsed playback seconds.
- **Request Body**: `{ "sessionToken": "hex-token", "watchSeconds": 15 }`

### `POST /videos/:id/claim-reward`
Claims completion reward. Validates 80% genuine playback engagement and prevents duplicate claims.
- **Ledger Impact**: Debits `SYSTEM_EXPENSE_REWARDS`, Credits `USER_AVAILABLE`.

---

## 4. Wallet & Double-Entry Ledger

### `GET /wallet/summary`
Returns user's available and reserved balances for both USD and PKR.

### `GET /wallet/transactions`
Paginated transaction journal showing references, entry types, debit/credit direction, and amounts.

---

## 5. Deposits & Manual Payments

### `GET /payments/methods`
Returns configured deposit gateways (`EASYPAISA`, `JAZZCASH`, `CRYPTO_USDT`, `BANK_TRANSFER`).

### `POST /payments/deposit`
Submits deposit request with unique reference / TxID and sender proof.
- **Response**: Created deposit request in `PENDING` status.

---

## 6. Withdrawals

### `POST /withdrawals/request`
Initiates withdrawal request.
- **Validation**: Checks `availableBalance >= amount`.
- **Ledger Impact**: Immediately places funds on hold (`USER_AVAILABLE` -> `USER_RESERVED`).

### `GET /withdrawals/my-withdrawals`
Returns user's withdrawal request history and lifecycle state.

---

## 7. Referrals

### `GET /referrals/summary`
Returns user's referral code, shareable link, registered members, and commission lineage journal.

---

## 8. Administrative Operations

Requires `SUPER_ADMIN` or `FINANCE_ADMIN` role:
- `GET /admin/kpis`: Real-time executive KPIs and double-entry ledger balance audit.
- `GET /admin/deposits`: Deposits verification queue.
- `POST /admin/deposits/:id/review`: Approve or reject deposit.
- `GET /admin/withdrawals`: Withdrawal processing queue.
- `POST /admin/withdrawals/:id/review`: Settle with external payout reference or reject and release hold.
- `GET /admin/users`: Search, filter, and view user profiles.
- `PATCH /admin/users/:id/status`: Suspend or reinstate user with audit log.
- `GET /admin/settings` & `PUT /admin/settings`: Manage system parameters.
