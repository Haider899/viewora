export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  FINANCE_ADMIN = 'FINANCE_ADMIN',
  CONTENT_ADMIN = 'CONTENT_ADMIN',
  SUPPORT_AGENT = 'SUPPORT_AGENT',
  USER = 'USER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export enum Currency {
  USD = 'USD',
  PKR = 'PKR',
}

export enum AccountType {
  USER_AVAILABLE = 'USER_AVAILABLE',
  USER_RESERVED = 'USER_RESERVED',
  SYSTEM_CASH_EASYPAISA = 'SYSTEM_CASH_EASYPAISA',
  SYSTEM_CASH_JAZZCASH = 'SYSTEM_CASH_JAZZCASH',
  SYSTEM_CASH_CRYPTO = 'SYSTEM_CASH_CRYPTO',
  SYSTEM_REVENUE_PACKAGES = 'SYSTEM_REVENUE_PACKAGES',
  SYSTEM_EXPENSE_REWARDS = 'SYSTEM_EXPENSE_REWARDS',
  SYSTEM_EXPENSE_REFERRALS = 'SYSTEM_EXPENSE_REFERRALS',
}

export enum LedgerTransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL_HOLD = 'WITHDRAWAL_HOLD',
  WITHDRAWAL_SETTLE = 'WITHDRAWAL_SETTLE',
  WITHDRAWAL_RELEASE = 'WITHDRAWAL_RELEASE',
  PACKAGE_PURCHASE = 'PACKAGE_PURCHASE',
  REWARD_CREDIT = 'REWARD_CREDIT',
  REFERRAL_COMMISSION = 'REFERRAL_COMMISSION',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum EntryType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum WithdrawalStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum DepositStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    [key: string]: any;
  };
}
