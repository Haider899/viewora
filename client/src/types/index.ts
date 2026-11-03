export type UserRole = 'SUPER_ADMIN' | 'FINANCE_ADMIN' | 'CONTENT_ADMIN' | 'SUPPORT_AGENT' | 'USER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
export type Currency = 'USD' | 'PKR';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  referralCode: string;
  referredById?: string;
  createdAt: string;
}

export interface Package {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  videoLimit: number;
  description?: string;
  badge?: string;
  features: string; // JSON array string
  isActive: boolean;
}

export interface PackagePurchase {
  id: string;
  userId: string;
  packageId: string;
  packageName: string;
  priceCentsPaid: number;
  currency: string;
  videoLimitGranted: number;
  status: string;
  purchasedAt: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  durationSeconds: number;
  category: string;
  minPackageTier: string;
  orderIndex: number;
  isPublished: boolean;
  rewardEligible: boolean;
  rewardAmountCents: number;
  assignedUserId?: string | null;
  assignedUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  hasAccess?: boolean;
  isAssignedToUser?: boolean;
  isWatched?: boolean;
  hasClaimedReward?: boolean;
  isYouTube?: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    sessions?: number;
    rewardClaims?: number;
  };
}

export interface WalletSummary {
  USD: {
    availableCents: number;
    reservedCents: number;
    totalCents: number;
  };
  PKR: {
    availableCents: number;
    reservedCents: number;
    totalCents: number;
  };
}

export interface LedgerEntryItem {
  id: string;
  transactionId: string;
  entryType: 'DEBIT' | 'CREDIT';
  amountCents: number;
  createdAt: string;
  transaction: {
    id: string;
    reference: string;
    transactionType: string;
    currency: string;
    description: string;
    createdAt: string;
  };
  account: {
    accountType: string;
    currency: string;
  };
}

export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  currency: string;
  instructions: string;
  accountTitle?: string;
  accountNumber?: string;
  qrCodeUrl?: string;
  minAmountCents: number;
  maxAmountCents: number;
  isActive: boolean;
}

export interface DepositRequest {
  id: string;
  userId: string;
  paymentMethodId: string;
  paymentMethod?: PaymentMethod;
  amountCents: number;
  currency: string;
  transactionRef: string;
  proofImageUrl?: string;
  senderPhone?: string;
  senderName?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amountCents: number;
  currency: string;
  payoutMethod: string;
  accountTitle: string;
  accountNumber: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  payoutRef?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface ReferralSummary {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  activeReferrals: number;
  totalCommissionCents: number;
  currency: string;
  referrals: Array<{
    id: string;
    fullName: string;
    email: string;
    status: string;
    createdAt: string;
    hasActivePackage: boolean;
  }>;
  commissions: Array<{
    id: string;
    sourceUserName: string;
    commissionCents: number;
    currency: string;
    ratePercent: number;
    createdAt: string;
  }>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
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

export interface AdminKpiData {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  pendingDepositsCount: number;
  pendingDepositsCents: { USD: number; PKR: number };
  verifiedDepositsCents: { USD: number; PKR: number };
  pendingWithdrawalsCount: number;
  pendingWithdrawalsCents: { USD: number; PKR: number };
  completedPayoutsCents: { USD: number; PKR: number };
  totalVideosCount: number;
  totalViewsCount: number;
  ledgerIntegrity: boolean;
}

export interface SupportMessage {
  id: string;
  conversationId: string;
  senderType: 'USER' | 'BOT' | 'AGENT';
  senderId?: string;
  senderName: string;
  message: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string;
}

export interface SupportConversation {
  id: string;
  userId?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  subject: string;
  status: 'BOT' | 'WAITING_FOR_AGENT' | 'AGENT_ACTIVE' | 'RESOLVED';
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  assignedToId?: string | null;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  assignedTo?: {
    id: string;
    fullName: string;
    role: string;
  };
  _count?: {
    messages: number;
  };
}

export interface SupportFaq {
  id: string;
  category: string;
  question: string;
  keywords: string[];
  answer: string;
  quickPrompts?: string[];
}

