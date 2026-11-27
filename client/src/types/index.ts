export type UserRole = 'SUPER_ADMIN' | 'FINANCE_ADMIN' | 'CONTENT_ADMIN' | 'SUPPORT_AGENT' | 'USER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
export type Currency = 'USD';

export interface UserLevelProgress {
  currentLevel: string;
  currentLevelName: string;
  nextLevel: string | null;
  nextLevelName: string | null;
  qualifyingVolumeCents: number;
  currentLevelMinCents: number;
  nextLevelMinCents: number | null;
  neededCents: number;
  progressPercent: number;
  videoLimit: number;
  dailyBonusRateBps: number;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  referralCode: string;
  memberCode?: string;
  referredById?: string;
  referredBy?: {
    id: string;
    fullName: string;
    memberCode?: string | null;
    referralCode?: string;
  } | null;
  savedPayoutMethod?: string | null;
  savedAccountTitle?: string | null;
  savedAccountNumber?: string | null;
  preferredTheme?: 'orange' | 'green' | null;
  accountLevel?: string;
  accountLockedUntil?: string | null;
  agentAvailability?: 'ONLINE' | 'BUSY' | 'OFFLINE';
  lastSeenAt?: string | null;
  lastLoginIp?: string | null;
  levelProgress?: UserLevelProgress | null;
  createdAt: string;
}

export interface CompanyDocument {
  id: string;
  title: string;
  documentType: string;
  fileUrl: string;
  description?: string;
  issuingAuthority?: string;
  licenseNumber?: string;
  isPublic: boolean;
  orderIndex: number;
  createdAt: string;
}

export interface AccountLevelConfig {
  id: string;
  levelKey: string;
  name: string;
  minQualificationUSD: number;
  maxQualificationUSD?: number | null;
  videoLimit: number;
  dailyBonusRateBps: number;
  badge?: string;
  isActive: boolean;
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
  levelKey?: string;
  isLifetime?: boolean;
  perVideoRewardCents?: number;
  unlockedAdsCount?: number;
  referralRateRange?: string;
  isCurrentPlan?: boolean;
  isOwnedOrLower?: boolean;
  isUpgrade?: boolean;
  currentPlanName?: string | null;
  currentPlanPriceCents?: number;
  upgradeDiffCents?: number;
  effectiveCostCents?: number;
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
  minAccountLevel?: string;
  orderIndex: number;
  isPublished: boolean;
  isLocked?: boolean;
  rewardEligible: boolean;
  rewardAmountCents: number;
  baseRewardAmountCents?: number;
  effectiveRewardCents?: number;
  rewardPercentageBps?: number | null;
  userVideoLimit?: number;
  cycleKey?: string;
  cycleEndsAt?: string;
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

/** USD-only wallet summary */
export interface WalletSummary {
  USD: {
    availableCents: number;
    creditBalanceCents?: number;
    subscriptionCreditCents?: number;
    reservedCents: number;
    referralCents: number;
    videoRewardsCents: number;
    otherRewardsCents: number;
    earningsTotalCents?: number;
    todayAdsEarningsCents?: number;
    todayAdsCompletedCount?: number;
    totalCents: number;
  };
}

export interface LiveActivityPopupItem {
  id: string;
  eventType: string;
  amountText: string;
  timeText: string;
  isActive: boolean;
  orderIndex: number;
}

export interface AdminDirectMessageItem {
  id: string;
  senderId: string;
  recipientId: string;
  subject: string;
  message: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  isRead: boolean;
  createdAt: string;
  sender?: { id: string; fullName: string; role: string };
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message?: string;
  body?: string;
  type: string;
  isRead: boolean;
  relatedId?: string | null;
  createdAt: string;
}

export interface LandingContent {
  badgeText?: string;
  heroTitle?: string;
  heroHighlight?: string;
  heroSubtitle?: string;
  heroCtaText?: string;
  videoPreviewHeading?: string;
  videoPreviewSubtitle?: string;
  rewardsHeading?: string;
  rewardsTitle?: string;
  rewardsSubtitle?: string;
  packagesTitle?: string;
  packagesSubtitle?: string;
  contactHeading?: string;
  contactSubtitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactHours?: string;
  contactAddress?: string;
  faqTitle?: string;
  announcementBanner?: string;
  announcementEnabled?: boolean;
}

export interface ReferralConfig {
  enabled: boolean;
  firstTransactionOnly: boolean;
  positions: Array<{
    level: number;
    rateBps: number;
  }>;
  milestones: Array<{
    minReferrals: number;
    maxReferrals: number | null;
    rankName: string;
    rewardUSD: number;
  }>;
}

export interface BonusSettings {
  videoBonus: {
    enabled: boolean;
    defaultRewardCents: number;
  };
  dailyBonus: {
    enabled: boolean;
  };
}

export interface NotificationSettings {
  depositApproved: boolean;
  depositRejected: boolean;
  withdrawalApproved: boolean;
  withdrawalRejected: boolean;
  referralCommission: boolean;
  videoReward: boolean;
  systemAlert: boolean;
}

export interface ReferralMilestoneClaim {
  id: string;
  userId: string;
  rankName: string;
  qualifiedCount: number;
  rewardAmountCents: number;
  currency: string;
  claimedAt: string;
}

export interface ReferralRankProgress {
  currentRank: string;
  nextRank: string;
  totalReferrals: number;
  qualifiedReferrals: number;
  targetQualified: number;
  remainingToNext: number;
  nextRewardUSD: number;
  milestoneClaims: ReferralMilestoneClaim[];
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
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  adminNotes?: string;
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
  sourceWallet?: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'COMPLETED' | 'REJECTED' | 'FAILED' | 'CANCELLED';
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
  pendingDepositsCents: { USD: number };
  verifiedDepositsCents: { USD: number };
  pendingWithdrawalsCount: number;
  pendingWithdrawalsCents: { USD: number };
  completedPayoutsCents: { USD: number };
  totalVideosCount: number;
  totalVideoCompletions: number;
  totalEligibleRewardsCents: number;
  totalReferrals: number;
  activeSupportAgents: number;
  onlineSupportAgents: number;
  waitingSupportChats: number;
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
  status: 'BOT' | 'WAITING_FOR_AGENT' | 'AGENT_ACTIVE' | 'ESCALATED_TO_ADMIN' | 'RESOLVED';
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  assignedToId?: string | null;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  ticketNumber?: string;
  queuePosition?: number | null;
  estimatedWaitMinutes?: number | null;
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

export interface AuditLogEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  userId?: string | null;
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  } | null;
}

export interface AdminSupportAgent {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  agentAvailability: 'ONLINE' | 'BUSY' | 'OFFLINE';
  createdAt: string;
}
