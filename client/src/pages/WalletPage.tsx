import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { LedgerEntryItem } from '../types/index.js';
import { useToast } from '../components/ToastProvider.js';
import {
  formatUSD,
  formatDateTime,
  formatAccountLevelLabel,
  getAccountLevelProgress,
  groupLedgerEntries,
  getTonePillClass,
  humanizeWalletName,
} from '../utils/formatters.js';
import {
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  CreditCard,
  CheckCircle2,
  Share2,
  DollarSign,
  AlertCircle,
  X,
  PlaySquare,
  Gift,
  Award,
  Users,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Layers,
  Repeat,
  Receipt,
} from 'lucide-react';

interface WalletProps {
  navigate?: (route: string) => void;
  referralRank?: string;
}

export const WalletPage: React.FC<WalletProps> = ({ navigate, referralRank = 'New' }) => {
  const { user, wallet, refreshWallet } = useAuth();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<LedgerEntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [expandedRef, setExpandedRef] = useState<string | null>(null);

  // Transfer Modal (Video Rewards or Referral Wallet -> Main Account)
  const [transferSource, setTransferSource] = useState<'REFERRAL' | 'VIDEO_REWARDS' | null>(null);
  const [transferAmountInput, setTransferAmountInput] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);

  const fetchTransactions = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.getTransactions(1, 20);
      if (res.success && res.data) {
        setEntries(res.data.entries || []);
      }
      if (isManual) {
        await refreshWallet();
        showToast('Balances and recent activity refreshed.', 'success');
      }
    } catch (err) {
      console.error('Failed to load transaction history:', err);
      if (isManual) showToast('Could not refresh right now.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshWallet();
    fetchTransactions(false);
  }, []);

  const mainAvailableCents = wallet?.USD?.availableCents ?? 0;
  const mainReservedCents = wallet?.USD?.reservedCents ?? 0;
  const videoRewardsCents = wallet?.USD?.videoRewardsCents ?? 0;
  const referralAvailableCents = wallet?.USD?.referralCents ?? 0;
  const otherRewardsCents = wallet?.USD?.otherRewardsCents ?? 0;
  const combinedCents =
    mainAvailableCents + videoRewardsCents + referralAvailableCents + otherRewardsCents;

  const levelProgress = getAccountLevelProgress(user?.accountLevel, combinedCents);
  const activeSourceCents =
    transferSource === 'VIDEO_REWARDS' ? videoRewardsCents : referralAvailableCents;

  const recentEvents = useMemo(() => groupLedgerEntries(entries).slice(0, 6), [entries]);

  const handleCopyInvite = () => {
    const code = user?.referralCode || '';
    const link = `${window.location.origin}/?ref=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedInvite(true);
    showToast('Invitation link copied to clipboard.', 'success');
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const openTransferModal = (source: 'REFERRAL' | 'VIDEO_REWARDS') => {
    setTransferSource(source);
    setTransferAmountInput('');
    setTransferError(null);
    setTransferSuccess(null);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferSource) return;
    setTransferError(null);
    setTransferSuccess(null);

    const parsedUSD = parseFloat(transferAmountInput);
    if (isNaN(parsedUSD) || parsedUSD <= 0) {
      setTransferError('Enter a valid amount greater than $0.00.');
      return;
    }

    const amountCents = Math.round(parsedUSD * 100);
    if (amountCents > activeSourceCents) {
      setTransferError(`Amount exceeds available balance (${formatUSD(activeSourceCents)}).`);
      return;
    }

    setTransferring(true);
    try {
      const res =
        transferSource === 'VIDEO_REWARDS'
          ? await api.transferVideoRewardsToMain(amountCents)
          : await api.transferReferralToMainBalance(amountCents);

      if (res.success) {
        await refreshWallet();
        await fetchTransactions(false);
        setTransferSuccess(`Moved ${formatUSD(amountCents)} into your Main Account.`);
        showToast(`${formatUSD(amountCents)} transferred to Main Account.`, 'success');
      } else {
        setTransferError(res.error?.message || 'Transfer could not be completed.');
      }
    } catch (err: any) {
      setTransferError(err.message || 'Transfer error.');
    } finally {
      setTransferring(false);
    }
  };

  const getEventIcon = (cat: string) => {
    switch (cat) {
      case 'deposit':
        return <ArrowDownLeft className="w-4 h-4 text-emerald-600" />;
      case 'withdrawal':
        return <ArrowUpRight className="w-4 h-4 text-slate-600" />;
      case 'reward':
      case 'referral':
        return <Sparkles className="w-4 h-4 text-emerald-600" />;
      case 'package':
        return <Layers className="w-4 h-4 text-slate-600" />;
      default:
        return <Repeat className="w-4 h-4 text-slate-500" />;
    }
  };

  const firstName = (user?.fullName || 'Member').split(' ')[0];

  return (
    <div className="space-y-6 animate-page-in">
      {/* Greeting Row with Level, Rank & Progress Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Good to see you, {firstName}
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Award className="w-3 h-3" />
              {formatAccountLevelLabel(user?.accountLevel)}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              <Users className="w-3 h-3 text-slate-500" />
              {referralRank} Rank
            </span>
          </div>

          <div className="flex items-center gap-3 max-w-md">
            <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${levelProgress.percent}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap tabular-nums">
              {levelProgress.nextLabel
                ? `${formatUSD(levelProgress.neededCents)} to ${levelProgress.nextLabel}`
                : 'Top Level Achieved'}
            </span>
          </div>
        </div>

        {/* Quick Actions Strip */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate?.('videos')}
            className="btn-secondary"
          >
            <PlaySquare className="w-4 h-4 text-emerald-600" />
            <span>Watch Videos</span>
          </button>
          <button
            type="button"
            onClick={handleCopyInvite}
            className="btn-secondary"
          >
            {copiedInvite ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Invite Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Restrained Emerald -> Navy Gradient Balance Hero (ONE primary CTA) */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white p-6 sm:p-7 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-emerald-300/90 uppercase tracking-wider">
              Total Available Balance (USD)
            </div>
            <div className="text-4xl sm:text-5xl font-black tracking-tight tabular-nums">
              {formatUSD(combinedCents)}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 pt-1">
              <span>
                Main: <strong className="text-white tabular-nums">{formatUSD(mainAvailableCents)}</strong>
              </span>
              <span>
                Video Rewards:{' '}
                <strong className="text-emerald-300 tabular-nums">{formatUSD(videoRewardsCents)}</strong>
              </span>
              <span>
                Referral:{' '}
                <strong className="text-emerald-300 tabular-nums">{formatUSD(referralAvailableCents)}</strong>
              </span>
              {mainReservedCents > 0 && (
                <span className="text-amber-300">
                  Pending payout hold: <strong className="tabular-nums">{formatUSD(mainReservedCents)}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => navigate?.('deposit')}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[10px] text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-950/30 transition-all duration-200 ease-out active:scale-[0.99] cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Deposit USD</span>
            </button>
          </div>
        </div>
      </div>

      {/* Three Identical Wallet Cards (consistent buttons, zero truncation, designed empty states) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. Main Account */}
        <div className="card-white card-hover p-5 flex flex-col justify-between gap-5">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Main Account</h3>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Primary
              </span>
            </div>

            <div className="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {formatUSD(mainAvailableCents)}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Used for deposits, membership plans, and direct USD withdrawals.
            </p>

            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Pending payout hold</span>
              <span
                className={`font-bold tabular-nums ${
                  mainReservedCents > 0 ? 'text-amber-600' : 'text-slate-400'
                }`}
              >
                {formatUSD(mainReservedCents)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => navigate?.('deposit')}
              className="btn-primary w-full"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Deposit</span>
            </button>
            <button
              type="button"
              onClick={() => navigate?.('withdrawal')}
              disabled={mainAvailableCents <= 0}
              title={mainAvailableCents <= 0 ? 'Add USD funds before requesting a withdrawal' : 'Request withdrawal'}
              className="btn-secondary w-full"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>

        {/* 2. Video Rewards */}
        <div className="card-white card-hover p-5 flex flex-col justify-between gap-5">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <PlaySquare className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Video Rewards</h3>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Earnings
              </span>
            </div>

            <div className="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {formatUSD(videoRewardsCents)}
            </div>

            {videoRewardsCents > 0 ? (
              <p className="text-xs text-slate-500 leading-relaxed">
                Earned from completed video campaigns. Move to Main or withdraw anytime.
              </p>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center justify-between gap-2">
                <span>Watch a campaign to earn your first USD credit.</span>
                <button
                  type="button"
                  onClick={() => navigate?.('videos')}
                  className="text-emerald-700 font-bold hover:underline whitespace-nowrap cursor-pointer"
                >
                  Browse →
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => openTransferModal('VIDEO_REWARDS')}
              disabled={videoRewardsCents <= 0}
              title={
                videoRewardsCents <= 0
                  ? 'Complete a video campaign to earn rewards first'
                  : 'Move Video Rewards into Main Account'
              }
              className="btn-primary w-full"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>To Main</span>
            </button>
            <button
              type="button"
              onClick={() => navigate?.('withdrawal')}
              disabled={videoRewardsCents <= 0}
              title={
                videoRewardsCents <= 0
                  ? 'Earn video rewards before requesting a withdrawal'
                  : 'Withdraw from Video Rewards'
              }
              className="btn-secondary w-full"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>

        {/* 3. Referral Wallet */}
        <div className="card-white card-hover p-5 flex flex-col justify-between gap-5">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Referral Wallet</h3>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Network
              </span>
            </div>

            <div className="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {formatUSD(referralAvailableCents)}
            </div>

            {referralAvailableCents > 0 ? (
              <p className="text-xs text-slate-500 leading-relaxed">
                Earned from invited members&apos; qualifying plans and rank milestones.
              </p>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center justify-between gap-2">
                <span>Invite your first member to earn 5%–15% USD commissions.</span>
                <button
                  type="button"
                  onClick={() => navigate?.('referrals')}
                  className="text-emerald-700 font-bold hover:underline whitespace-nowrap cursor-pointer"
                >
                  Invite →
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => openTransferModal('REFERRAL')}
              disabled={referralAvailableCents <= 0}
              title={
                referralAvailableCents <= 0
                  ? 'Invite a qualifying referral to earn commissions first'
                  : 'Move Referral Wallet into Main Account'
              }
              className="btn-primary w-full"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>To Main</span>
            </button>
            <button
              type="button"
              onClick={() => navigate?.('withdrawal')}
              disabled={referralAvailableCents <= 0}
              title={
                referralAvailableCents <= 0
                  ? 'Earn referral commissions before requesting a withdrawal'
                  : 'Withdraw from Referral Wallet'
              }
              className="btn-secondary w-full"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>
      </div>

      {/* Optional Approved Bonus Rewards Strip */}
      {otherRewardsCents > 0 && (
        <div className="card-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-emerald-200 bg-emerald-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Bonus Rewards Available</div>
              <div className="text-xs text-slate-600">
                Daily level bonuses and special account credits ready for withdrawal.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {formatUSD(otherRewardsCents)}
            </span>
            <button type="button" onClick={() => navigate?.('withdrawal')} className="btn-primary">
              Withdraw
            </button>
          </div>
        </div>
      )}

      {/* Human-Readable Recent Activity (1 row per event, green credits / red debits, expandable legs) */}
      <div className="card-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Activity</h3>
            <p className="text-xs text-slate-500">
              One clear line per event — click any row to inspect the full double-entry record.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchTransactions(true)}
              disabled={refreshing}
              className="btn-secondary !h-9 !px-3"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate?.('transactions')}
              className="btn-secondary !h-9 !px-3"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-14 rounded-xl skeleton-shimmer" />
            ))}
          </div>
        ) : recentEvents.length === 0 ? (
          <div className="py-12 px-6 text-center space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-slate-900">No activity yet</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Once you deposit USD, unlock a plan, or finish a video campaign, every movement shows up here clearly.
            </p>
            <div className="pt-1">
              <button type="button" onClick={() => navigate?.('deposit')} className="btn-primary">
                Deposit USD
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentEvents.map((row) => {
              const isExpanded = expandedRef === row.reference;
              const isCredit = row.signedCents > 0 && !row.isInternalTransfer;
              const isDebit = row.signedCents < 0;

              return (
                <div key={row.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedRef(isExpanded ? null : row.reference)}
                    className="w-full text-left px-5 py-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
                        {getEventIcon(row.category)}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{row.label}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTonePillClass(
                              row.tone
                            )}`}
                          >
                            {row.walletLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-snug">{row.description}</p>
                        <div className="text-[11px] text-slate-400">
                          {formatDateTime(row.createdAt)} ·{' '}
                          <span className="font-mono text-slate-500">{row.shortReference}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`text-sm font-extrabold tabular-nums ${
                          row.isInternalTransfer
                            ? 'text-slate-800'
                            : isCredit
                            ? 'text-emerald-600'
                            : isDebit
                            ? 'text-rose-600'
                            : 'text-slate-900'
                        }`}
                      >
                        {row.isInternalTransfer
                          ? formatUSD(row.amountCents)
                          : formatUSD(row.signedCents, true)}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-4 pt-2 bg-slate-50/80 border-t border-slate-100 space-y-2 animate-dropdown-in">
                      <div className="text-[11px] text-slate-500 flex flex-wrap justify-between gap-2">
                        <span>Reference:</span>
                        <span className="font-mono font-semibold text-slate-700">{row.reference}</span>
                      </div>
                      <div className="rounded-xl bg-white border border-slate-200 divide-y divide-slate-100">
                        {row.legs.map((leg) => (
                          <div key={leg.id} className="px-3 py-2 flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">
                              {humanizeWalletName(leg.account?.accountType)} ({leg.entryType === 'CREDIT' ? 'Credit' : 'Debit'})
                            </span>
                            <span
                              className={`font-bold tabular-nums ${
                                leg.entryType === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {leg.entryType === 'CREDIT' ? '+' : '-'}
                              {formatUSD(leg.amountCents)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transfer to Main Modal (always has X + Cancel, real post-action figures, smooth animation) */}
      {transferSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 p-6 space-y-5 shadow-2xl relative animate-modal-in">
            <button
              type="button"
              onClick={() => setTransferSource(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 pr-8">
              <h3 className="text-lg font-bold text-slate-900">
                {transferSource === 'VIDEO_REWARDS'
                  ? 'Move Video Rewards to Main'
                  : 'Move Referral Balance to Main'}
              </h3>
              <p className="text-xs text-slate-500">
                Transfer funds instantly into your Main Account for plans or combined withdrawals.
              </p>
            </div>

            {transferSuccess ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{transferSuccess}</span>
                  </div>
                  <div className="pl-6 text-emerald-800">
                    Updated Main Account balance:{' '}
                    <strong className="tabular-nums">{formatUSD(mainAvailableCents)}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTransferSource(null)}
                  className="btn-primary w-full"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleExecuteTransfer} noValidate className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Amount (USD) <span className="text-rose-600">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setTransferAmountInput((activeSourceCents / 100).toFixed(2));
                        setTransferError(null);
                      }}
                      className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer tabular-nums"
                    >
                      Use max ({formatUSD(activeSourceCents)})
                    </button>
                  </div>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={(activeSourceCents / 100).toFixed(2)}
                      placeholder="0.00"
                      value={transferAmountInput}
                      onChange={(e) => {
                        setTransferAmountInput(e.target.value);
                        setTransferError(null);
                      }}
                      className="w-full h-11 bg-slate-50 border border-slate-200 rounded-[10px] pl-9 pr-4 text-sm text-slate-900 font-bold tabular-nums focus:border-emerald-500"
                    />
                  </div>
                </div>

                {parseFloat(transferAmountInput) > 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Remaining in source wallet</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {formatUSD(Math.max(0, activeSourceCents - Math.round(parseFloat(transferAmountInput) * 100)))}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>New Main Account balance</span>
                      <span className="font-bold text-emerald-700 tabular-nums">
                        {formatUSD(mainAvailableCents + Math.round(parseFloat(transferAmountInput) * 100))}
                      </span>
                    </div>
                  </div>
                )}

                {transferError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{transferError}</span>
                  </div>
                )}

                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setTransferSource(null)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={transferring || !(parseFloat(transferAmountInput) > 0)}
                    className="btn-primary flex-1"
                  >
                    <span>{transferring ? 'Moving…' : 'Confirm Transfer'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
