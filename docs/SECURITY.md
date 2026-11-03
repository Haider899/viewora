# VistaraX Security & Fraud Mitigation Architecture

## 1. Role-Based Access Control (RBAC) & Principle of Least Privilege

The VistaraX platform enforces strict backend role boundaries:

| Operation | Super Admin | Finance Admin | Content Admin | Support Agent | User |
|---|:---:|:---:|:---:|:---:|:---:|
| Approve Financial Deposits | Yes | Yes | **No** | **No** | **No** |
| Process Withdrawal Payouts | Yes | Yes | **No** | **No** | **No** |
| Access Financial Ledgers | Yes | Yes | **No** | Read Only | Own Only |
| Modify Video Curations | Yes | **No** | Yes | **No** | **No** |
| Suspend User Accounts | Yes | **No** | **No** | **No** | **No** |
| Stream Gated Masterclasses | Yes | Yes | Yes | Yes | Package-Gated |

- **Support Agents** are strictly prohibited from approving financial transactions or modifying wallet balances.
- **Content Administrators** have no visibility into treasury balances or transaction verification queues.

---

## 2. Financial Ledger Security & Immutability

1. **Strict Double-Entry Enforcement**: The ledger service algorithmically rejects any transaction where total debits do not equal total credits.
2. **Fixed-Precision Minor Units**: All amounts are integers in cents/paisa. Floating-point arithmetic is never used for currency balances.
3. **Double-Spending Prevention**: Withdrawal requests immediately place funds on a `USER_RESERVED` hold inside an atomic database transaction.
4. **Idempotency Keys**: All financial transactions mandate unique reference keys. Replays are rejected by unique constraints.

---

## 3. Video Telemetry & Anti-Cheat

1. **Cryptographic Session Tokens**: Sessions require a 32-byte cryptographically secure token.
2. **Real-Time Heartbeat Telemetry**: Client watch seconds cannot exceed real wall-clock elapsed time by more than 15 seconds. Fast-forwarding or scripting completion is detected and rejected.
3. **Anti-Duplicate Reward Constraint**: Unique database constraint `(userId, videoId)` guarantees that no video completion reward can ever be credited more than once.

---

## 4. Input Sanitization & Authentication

- 100% of API endpoints validate inputs using Zod schemas.
- Helmet security headers and CORS protection.
- Password hashes use bcrypt with work factor 10.
- Secrets are isolated in `.env` files and excluded from version control.
