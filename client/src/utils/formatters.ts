import { LedgerEntryItem } from '../types/index.js';

/** Format USD cents as tabular $1,234.56 */
export function formatUSD(cents: number, showSign = false): string {
  const abs = Math.abs(cents) / 100;
  const formatted = `$${abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  if (!showSign) return cents < 0 ? `-${formatted}` : formatted;
  if (cents > 0) return `+${formatted}`;
  if (cents < 0) return `-${formatted}`;
  return formatted;
}

/** Unified date & time format: "25 Nov 2026, 1:21 PM" (never seconds) */
export function formatDateTime(input?: string | Date | null): string {
  if (!input) return '—';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '—';
  const datePart = d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
}

/** Unified date format: "25 Nov 2026" */
export function formatDate(input?: string | Date | null): string {
  if (!input) return '—';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Relative time for notifications: "Just now", "4m ago", "2h ago", "Yesterday", "25 Nov" */
export function formatRelativeTime(input?: string | Date | null): string {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Video duration formatted as 0:52 or 1:15 */
export function formatDurationMMSS(seconds?: number | null): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}:${rem.toString().padStart(2, '0')}`;
}

/** Format account level key cleanly */
export function formatAccountLevelLabel(level?: string | null): string {
  if (!level || level === 'NEW_USER' || level === 'LEVEL_0') return 'New User';
  const match = /^LEVEL_(\d+)$/i.exec(level);
  if (match) return `Level ${match[1]}`;
  return level.replace(/_/g, ' ');
}

/** Human-readable payout method label (no raw codes like CRYPTO_USDT) */
export function formatPayoutMethod(code?: string | null): string {
  switch ((code || '').toUpperCase()) {
    case 'CRYPTO_USDT':
      return 'Crypto — USDT TRC-20';
    case 'BINANCE':
      return 'Binance Pay / UID';
    case 'USD_BANK_WIRE':
      return 'USD Bank Wire';
    case 'CRYPTO_BTC':
      return 'Crypto — Bitcoin';
    default:
      return (code || 'USD Payout').replace(/_/g, ' ');
  }
}

/** Shorten long wallet addresses or references cleanly */
export function shortenCode(val?: string | null, head = 6, tail = 6): string {
  if (!val) return '—';
  if (val.length <= head + tail + 3) return val;
  return `${val.slice(0, head)}…${val.slice(-tail)}`;
}

/** Mask email address for referral privacy: "john.doe@example.com" -> "j***e@example.com" */
export function maskEmail(email?: string | null): string {
  if (!email || !email.includes('@')) return 'Member';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/** Get user initials for avatar circles */
export function getInitials(name?: string | null): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Human wallet label */
export function humanizeWalletName(accountType?: string | null): string {
  switch (accountType) {
    case 'USER_AVAILABLE':
      return 'Subscription Credit';
    case 'USER_VIDEO_REWARDS':
      return 'Video Ad Rewards';
    case 'USER_REFERRAL':
      return 'Referral Earnings';
    case 'USER_RESERVED':
      return 'Withdrawal Hold';
    case 'USER_OTHER_REWARDS':
      return 'Bonus Rewards';
    default:
      return (accountType || 'Wallet').replace(/^USER_/, '').replace(/_/g, ' ');
  }
}

export interface TxMeta {
  label: string;
  tone: 'success' | 'pending' | 'error' | 'neutral';
  category: 'deposit' | 'withdrawal' | 'reward' | 'package' | 'referral' | 'transfer' | 'adjustment';
}

/** Semantic human metadata for ledger transaction types (strict colour grammar) */
export function getTxMeta(type: string): TxMeta {
  switch (type) {
    case 'DEPOSIT':
      return { label: 'Deposit', tone: 'success', category: 'deposit' };
    case 'PACKAGE_PURCHASE':
      return { label: 'Plan Purchase', tone: 'neutral', category: 'package' };
    case 'REWARD_CREDIT':
      return { label: 'Video Reward', tone: 'success', category: 'reward' };
    case 'DAILY_BONUS':
      return { label: 'Daily Level Bonus', tone: 'success', category: 'reward' };
    case 'MILESTONE_REWARD':
      return { label: 'Rank Milestone', tone: 'success', category: 'referral' };
    case 'REFERRAL_COMMISSION':
      return { label: 'Referral Commission', tone: 'success', category: 'referral' };
    case 'VIDEO_REWARD_CONVERT':
      return { label: 'Video → Main Transfer', tone: 'neutral', category: 'transfer' };
    case 'REFERRAL_CONVERT':
      return { label: 'Referral → Main Transfer', tone: 'neutral', category: 'transfer' };
    case 'WITHDRAWAL_HOLD':
      return { label: 'Withdrawal Pending', tone: 'pending', category: 'withdrawal' };
    case 'WITHDRAWAL_SETTLE':
      return { label: 'Withdrawal Completed', tone: 'success', category: 'withdrawal' };
    case 'WITHDRAWAL_RELEASE':
      return { label: 'Withdrawal Rejected', tone: 'error', category: 'withdrawal' };
    case 'ADMIN_ADJUSTMENT':
      return { label: 'Account Adjustment', tone: 'neutral', category: 'adjustment' };
    default:
      return { label: type.replace(/_/g, ' '), tone: 'neutral', category: 'adjustment' };
  }
}

export function getTonePillClass(tone: 'success' | 'pending' | 'error' | 'neutral'): string {
  switch (tone) {
    case 'success':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'error':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export interface HumanActivityRow {
  id: string;
  reference: string;
  shortReference: string;
  createdAt: string;
  transactionType: string;
  label: string;
  tone: 'success' | 'pending' | 'error' | 'neutral';
  category: TxMeta['category'];
  description: string;
  walletLabel: string;
  walletKey: string;
  /** Signed cents from user's perspective (+credit, -debit, 0 for internal transfer shown with amountCents) */
  signedCents: number;
  amountCents: number;
  isInternalTransfer: boolean;
  legs: LedgerEntryItem[];
}

/**
 * Collapses double-entry CREDIT + DEBIT rows sharing the same transaction.reference
 * into ONE human-readable activity row while preserving `legs` for expandable audit detail.
 */
export function groupLedgerEntries(entries: LedgerEntryItem[]): HumanActivityRow[] {
  const byRef = new Map<string, LedgerEntryItem[]>();
  const order: string[] = [];

  for (const entry of entries) {
    const ref = entry.transaction?.reference || entry.id;
    if (!byRef.has(ref)) {
      byRef.set(ref, []);
      order.push(ref);
    }
    byRef.get(ref)!.push(entry);
  }

  return order.map((ref) => {
    const legs = byRef.get(ref)!;
    const primary = legs[0];
    const txType = primary.transaction?.transactionType || 'ADJUSTMENT';
    const meta = getTxMeta(txType);

    const isTransfer =
      txType === 'VIDEO_REWARD_CONVERT' ||
      txType === 'REFERRAL_CONVERT' ||
      txType === 'WITHDRAWAL_HOLD' ||
      txType === 'WITHDRAWAL_RELEASE';

    // Determine primary leg from user perspective
    const creditLeg = legs.find((l) => l.entryType === 'CREDIT');
    const debitLeg = legs.find((l) => l.entryType === 'DEBIT');

    let signedCents = primary.entryType === 'CREDIT' ? primary.amountCents : -primary.amountCents;
    let walletLabel = humanizeWalletName(primary.account?.accountType);
    let walletKey = primary.account?.accountType || 'USER_AVAILABLE';

    if (txType === 'VIDEO_REWARD_CONVERT') {
      walletLabel = 'Video Rewards → Main';
      walletKey = 'USER_VIDEO_REWARDS';
      signedCents = primary.amountCents;
    } else if (txType === 'REFERRAL_CONVERT') {
      walletLabel = 'Referral → Main';
      walletKey = 'USER_REFERRAL';
      signedCents = primary.amountCents;
    } else if (txType === 'WITHDRAWAL_HOLD') {
      const src = debitLeg || primary;
      walletLabel = humanizeWalletName(src.account?.accountType);
      walletKey = src.account?.accountType || 'USER_AVAILABLE';
      signedCents = -primary.amountCents;
    } else if (txType === 'WITHDRAWAL_SETTLE') {
      walletLabel = 'Withdrawal Payout';
      walletKey = 'USER_RESERVED';
      signedCents = -primary.amountCents;
    } else if (txType === 'WITHDRAWAL_RELEASE') {
      const dst = creditLeg || primary;
      walletLabel = humanizeWalletName(dst.account?.accountType);
      walletKey = dst.account?.accountType || 'USER_AVAILABLE';
      signedCents = primary.amountCents;
    } else if (creditLeg && !debitLeg) {
      walletLabel = humanizeWalletName(creditLeg.account?.accountType);
      walletKey = creditLeg.account?.accountType || 'USER_AVAILABLE';
      signedCents = creditLeg.amountCents;
    } else if (debitLeg && !creditLeg) {
      walletLabel = humanizeWalletName(debitLeg.account?.accountType);
      walletKey = debitLeg.account?.accountType || 'USER_AVAILABLE';
      signedCents = -debitLeg.amountCents;
    }

    // Clean any raw account codes from descriptions
    const rawDesc = primary.transaction?.description || meta.label;
    const cleanDesc = rawDesc
      .replace(/USER_AVAILABLE/g, 'Subscription Credit')
      .replace(/USER_VIDEO_REWARDS/g, 'Video Ad Rewards')
      .replace(/USER_REFERRAL/g, 'Referral Earnings')
      .replace(/USER_RESERVED/g, 'Withdrawal Hold')
      .replace(/CRYPTO_USDT/g, 'USDT TRC-20')
      .replace(/BINANCE/g, 'Binance Pay')
      .replace(/USD_BANK_WIRE/g, 'USD Bank Wire')
      .replace(/VistaraX/gi, 'U-Ads');

    return {
      id: primary.id,
      reference: ref,
      shortReference: shortenCode(ref, 10, 6),
      createdAt: primary.createdAt,
      transactionType: txType,
      label: meta.label,
      tone: meta.tone,
      category: meta.category,
      description: cleanDesc,
      walletLabel,
      walletKey,
      signedCents,
      amountCents: primary.amountCents,
      isInternalTransfer:
        isTransfer &&
        (txType === 'VIDEO_REWARD_CONVERT' ||
          txType === 'REFERRAL_CONVERT' ||
          txType === 'WITHDRAWAL_RELEASE'),
      legs,
    };
  });
}

/** Calculate user's account level progress (for sidebar level card & dashboard greeting) */
export function getAccountLevelProgress(level?: string | null, totalCents = 0) {
  const ladder = [
    { key: 'NEW_USER', label: 'New User', minCents: 0 },
    { key: 'LEVEL_1', label: 'Level 1', minCents: 2000 },
    { key: 'LEVEL_2', label: 'Level 2', minCents: 10000 },
    { key: 'LEVEL_3', label: 'Level 3', minCents: 50000 },
    { key: 'LEVEL_4', label: 'Level 4', minCents: 200000 },
    { key: 'LEVEL_5', label: 'Level 5', minCents: 500000 },
  ];
  const normalized = !level || level === 'LEVEL_0' ? 'NEW_USER' : level;
  const idx = Math.max(0, ladder.findIndex((l) => l.key === normalized));
  const current = ladder[idx] || ladder[0];
  const next = ladder[idx + 1] || null;
  if (!next) {
    return { currentLabel: current.label, nextLabel: null, percent: 100, neededCents: 0 };
  }
  const span = Math.max(1, next.minCents - current.minCents);
  const gained = Math.max(0, totalCents - current.minCents);
  const percent = Math.min(100, Math.max(8, Math.round((gained / span) * 100)));
  const neededCents = Math.max(0, next.minCents - totalCents);
  return { currentLabel: current.label, nextLabel: next.label, percent, neededCents };
}
