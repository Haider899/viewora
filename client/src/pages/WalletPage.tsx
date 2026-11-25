import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Video } from '../types/index.js';
import { useToast } from '../components/ToastProvider.js';
import {
  formatUSD,
  formatAccountLevelLabel,
  formatDurationMMSS,
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
  Clock,
  Play,
  Lock,
  Receipt,
  Sparkles,
} from 'lucide-react';

interface WalletProps {
  navigate?: (route: string, state?: any) => void;
  referralRank?: string;
}

export const WalletPage: React.FC<WalletProps> = ({ navigate, referralRank = 'New' }) => {
  const { user, wallet, refreshWallet, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [dailyStatus, setDailyStatus] = useState<any>(null);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Locked video upgrade prompt modal (Requirement #4)
  const [lockedModalVideo, setLockedModalVideo] = useState<Video | null>(null);

  // Transfer Modal (Video Rewards or Referral Wallet -> Main Account)
  const [transferSource, setTransferSource] = useState<'REFERRAL' | 'VIDEO_REWARDS' | null>(null);
  const [transferAmountInput, setTransferAmountInput] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState<{ msg: string; updatedMainCents: number } | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);

  const loadDashboardData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else {
      setLoadingVideos(true);
      setLoadingDaily(true);
    }
    try {
      const [vidRes, dailyRes] = await Promise.all([
        api.getVideos(),
        api.getDailyVideoStatus(),
      ]);
      if (vidRes.success && Array.isArray(vidRes.data)) {
        setVideos(vidRes.data);
      }
      if (dailyRes.success && dailyRes.data) {
        setDailyStatus(dailyRes.data);
      }
      if (isManual) {
        await Promise.all([refreshWallet(), refreshUser()]);
        showToast('Balances and campaigns refreshed.', 'success');
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      if (isManual) showToast('Could not refresh right now.', 'error');
    } finally {
      setLoadingVideos(false);
      setLoadingDaily(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshWallet();
    loadDashboardData(false);
  }, []);

  const walletLoaded = wallet !== null;
  const mainAvailableCents = wallet?.USD?.availableCents ?? 0;
  const mainReservedCents = wallet?.USD?.reservedCents ?? 0;
  const videoRewardsCents = wallet?.USD?.videoRewardsCents ?? 0;
  const referralAvailableCents = wallet?.USD?.referralCents ?? 0;
  const otherRewardsCents = wallet?.USD?.otherRewardsCents ?? 0;
  const combinedCents =
    mainAvailableCents + videoRewardsCents + referralAvailableCents + otherRewardsCents;

  // Authoritative server-calculated Level Progress (strictly from qualifying volume — never cash balance!)
  const lp = user?.levelProgress;
  const currentLevelLabel = lp?.currentLevelName || formatAccountLevelLabel(user?.accountLevel);
  const nextLevelLabel = lp?.nextLevelName || null;
  const levelPercent = lp?.progressPercent ?? 0;
  const levelNeededCents = lp?.neededCents ?? 0;

  const activeSourceCents =
    transferSource === 'VIDEO_REWARDS' ? videoRewardsCents : referralAvailableCents;

  // All 10 published videos shown in a 2-column grid (no video hidden — Requirement #2)
  const homeVideos = videos.slice(0, 10);

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
    if (!transferSource || transferring) return;
    setTransferError(null);

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

    const expectedMainAfter = mainAvailableCents + amountCents;
    setTransferring(true);
    try {
      const res =
        transferSource === 'VIDEO_REWARDS'
          ? await api.transferVideoRewardsToMain(amountCents)
          : await api.transferReferralToMainBalance(amountCents);

      if (res.success) {
        // Set success state BEFORE refreshWallet() so zero-frame wrong-balance flash never happens (#9)
        setTransferSuccess({
          msg: `Moved ${formatUSD(amountCents)} into your Main Account.`,
          updatedMainCents: expectedMainAfter,
        });
        showToast(`${formatUSD(amountCents)} transferred to Main Account.`, 'success');
        await refreshWallet();
      } else {
        setTransferError(res.error?.message || 'Transfer could not be completed.');
      }
    } catch (err: any) {
      setTransferError(err.message || 'Transfer error.');
    } finally {
      setTransferring(false);
    }
  };

  const handleClaimDailyReward = async () => {
    if (claimingDaily) return;
    setClaimingDaily(true);
    try {
      const res = await api.claimDailyVideoReward();
      if (res.success) {
        showToast(res.message || 'Daily reward claimed!', 'success');
        await Promise.all([refreshWallet(), loadDashboardData(false)]);
      } else {
        showToast(res.error?.message || 'Unable to claim daily reward yet.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Could not claim daily reward.', 'error');
    } finally {
      setClaimingDaily(false);
    }
  };

  const formatLocalDeadline = (iso?: string) => {
    if (!iso) return '8:00 AM';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '8:00 AM';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const firstName = (user?.fullName || 'Member').split(' ')[0];

  return (
    <div className="space-y-5 animate-page-in">
      {/* Greeting Row with Authoritative Level Progress */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Good to see you, {firstName}
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Award className="w-3 h-3" />
              {currentLevelLabel}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              <Users className="w-3 h-3 text-slate-500" />
              {referralRank} Rank
            </span>
          </div>

          {lp ? (
            <div className="flex items-center gap-3 max-w-md">
              <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${levelPercent}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap tabular-nums">
                {nextLevelLabel
                  ? `${formatUSD(levelNeededCents)} qualifying volume to ${nextLevelLabel}`
                  : 'Top Level Achieved'}
              </span>
            </div>
          ) : (
            <div className="h-3 w-52 rounded skeleton-shimmer" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="btn-secondary !h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
          <button type="button" onClick={handleCopyInvite} className="btn-secondary !h-9">
            {copiedInvite ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Invite Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Restrained Emerald -> Navy Balance Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white p-5 sm:p-6 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-52 h-52 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-emerald-300/90 uppercase tracking-wider">
              Total Available Balance (USD)
            </div>
            {walletLoaded ? (
              <>
                <div className="text-3xl sm:text-4xl font-black tracking-tight tabular-nums">
                  {formatUSD(combinedCents)}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 pt-0.5">
                  <span>
                    Main: <strong className="text-white tabular-nums">{formatUSD(mainAvailableCents)}</strong>
                  </span>
                  <span>
                    Video:{' '}
                    <strong className={videoRewardsCents > 0 ? 'text-emerald-300 tabular-nums' : 'text-slate-400 tabular-nums'}>
                      {formatUSD(videoRewardsCents)}
                    </strong>
                  </span>
                  <span>
                    Referral:{' '}
                    <strong className={referralAvailableCents > 0 ? 'text-emerald-300 tabular-nums' : 'text-slate-400 tabular-nums'}>
                      {formatUSD(referralAvailableCents)}
                    </strong>
                  </span>
                  {mainReservedCents > 0 && (
                    <span className="text-amber-300">
                      Hold: <strong className="tabular-nums">{formatUSD(mainReservedCents)}</strong>
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="h-10 w-44 rounded-xl bg-white/10 animate-pulse" />
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate?.('deposit')}
            className="btn-primary !h-10 !px-5 !bg-emerald-500 hover:!bg-emerald-400 !text-slate-950 shrink-0"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Deposit USD</span>
          </button>
        </div>
      </div>

      {/* Three Compact USD Wallet Cards (~15% more compact per Requirement #6) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. Main Account */}
        <div className="card-white card-hover p-4 flex flex-col justify-between gap-3.5">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Main Account</h3>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Primary
              </span>
            </div>

            {walletLoaded ? (
              <div
                className={`text-2xl font-extrabold tracking-tight tabular-nums ${
                  mainAvailableCents > 0 ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                {formatUSD(mainAvailableCents)}
              </div>
            ) : (
              <div className="h-8 w-28 rounded-lg skeleton-shimmer" />
            )}

            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
              <span className="text-slate-500">Pending payout hold</span>
              <span className={`font-bold tabular-nums ${mainReservedCents > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                {formatUSD(mainReservedCents)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => navigate?.('deposit')} className="btn-primary !h-9 w-full">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Deposit</span>
            </button>
            <button
              type="button"
              onClick={() => navigate?.('withdrawal')}
              disabled={mainAvailableCents <= 0}
              title={mainAvailableCents <= 0 ? 'Deposit USD before withdrawing' : 'Request withdrawal'}
              className="btn-secondary !h-9 w-full"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>

        {/* 2. Video Rewards */}
        <div className="card-white card-hover p-4 flex flex-col justify-between gap-3.5">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <PlaySquare className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Video Rewards</h3>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Earnings
              </span>
            </div>

            {walletLoaded ? (
              <div
                className={`text-2xl font-extrabold tracking-tight tabular-nums ${
                  videoRewardsCents > 0 ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {formatUSD(videoRewardsCents)}
              </div>
            ) : (
              <div className="h-8 w-28 rounded-lg skeleton-shimmer" />
            )}

            <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              {videoRewardsCents > 0
                ? 'Credited from completed video campaigns.'
                : 'Complete campaigns below to start earning.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => openTransferModal('VIDEO_REWARDS')}
              disabled={videoRewardsCents <= 0}
              title={videoRewardsCents <= 0 ? 'Watch a campaign to earn rewards first' : 'Move to Main Account'}
              className="btn-primary !h-9 w-full"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>To Main</span>
            </button>
            <button
              type="button"
              onClick={() => navigate?.('withdrawal')}
              disabled={videoRewardsCents <= 0}
              title={videoRewardsCents <= 0 ? 'Earn video rewards first' : 'Withdraw video rewards'}
              className="btn-secondary !h-9 w-full"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>

        {/* 3. Referral Wallet */}
        <div className="card-white card-hover p-4 flex flex-col justify-between gap-3.5">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Referral Wallet</h3>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Network
              </span>
            </div>

            {walletLoaded ? (
              <div
                className={`text-2xl font-extrabold tracking-tight tabular-nums ${
                  referralAvailableCents > 0 ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {formatUSD(referralAvailableCents)}
              </div>
            ) : (
              <div className="h-8 w-28 rounded-lg skeleton-shimmer" />
            )}

            <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              {referralAvailableCents > 0
                ? 'Commissions & rank milestone payouts.'
                : 'Invite members to earn 5%–15% commissions.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => openTransferModal('REFERRAL')}
              disabled={referralAvailableCents <= 0}
              title={referralAvailableCents <= 0 ? 'Earn referral commissions first' : 'Move to Main Account'}
              className="btn-primary !h-9 w-full"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>To Main</span>
            </button>
            <button
              type="button"
              onClick={() => navigate?.('withdrawal')}
              disabled={referralAvailableCents <= 0}
              title={referralAvailableCents <= 0 ? 'Earn referral commissions first' : 'Withdraw referral balance'}
              className="btn-secondary !h-9 w-full"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>
      </div>

      {/* Requirement #1: Only a clean "View Recent Activity" button below Referral Wallet (opens separate Transactions history page) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate?.('transactions')}
          className="btn-secondary w-full sm:w-auto justify-between sm:justify-center !px-5"
        >
          <span className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>View Recent Activity</span>
          </span>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </button>

        {otherRewardsCents > 0 && (
          <div className="px-4 py-2 rounded-[10px] bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-emerald-600" />
              Bonus Rewards: <strong className="tabular-nums">{formatUSD(otherRewardsCents)}</strong>
            </span>
            <button
              type="button"
              onClick={() => navigate?.('withdrawal')}
              className="font-bold text-emerald-700 hover:underline cursor-pointer"
            >
              Withdraw →
            </button>
          </div>
        )}
      </div>

      {/* Requirement #5: Daily Video Completion Reward Status & Claim (resets daily at configured hour e.g. 8 AM, expires — no carry forward) */}
      <div className="card-white p-4 sm:p-5">
        {loadingDaily ? (
          <div className="h-14 rounded-xl skeleton-shimmer" />
        ) : dailyStatus ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-slate-900">Daily Video Reward</span>
                {dailyStatus.videosRequired > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 tabular-nums">
                    {Math.min(dailyStatus.videosCompletedToday, dailyStatus.videosRequired)} / {dailyStatus.videosRequired} completed today
                  </span>
                )}
                {dailyStatus.alreadyClaimedToday && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Claimed Today
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {dailyStatus.videosRequired <= 0 ? (
                  'Upgrade to Level 1 or higher to unlock daily video rewards.'
                ) : dailyStatus.alreadyClaimedToday ? (
                  `You claimed ${formatUSD(dailyStatus.claimedAmountCents)} today. Next cycle starts at ${formatLocalDeadline(dailyStatus.windowEnd)}.`
                ) : (
                  <>
                    Complete all <strong>{dailyStatus.videosRequired}</strong> eligible videos before{' '}
                    <strong>{formatLocalDeadline(dailyStatus.windowEnd)}</strong> to claim{' '}
                    <strong className="text-emerald-700 tabular-nums">
                      {formatUSD(dailyStatus.estimatedRewardCents)}
                    </strong>{' '}
                    ({((dailyStatus.dailyBonusRateBps || 0) / 100).toFixed(2)}% daily rate). Unclaimed daily rewards expire at reset and do not carry forward.
                  </>
                )}
              </p>
            </div>

            <div className="shrink-0">
              {dailyStatus.videosRequired <= 0 ? (
                <button type="button" onClick={() => navigate?.('packages')} className="btn-primary w-full sm:w-auto">
                  Upgrade Plan
                </button>
              ) : dailyStatus.alreadyClaimedToday ? (
                <button type="button" disabled className="btn-secondary w-full sm:w-auto">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Claimed</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleClaimDailyReward}
                  disabled={!dailyStatus.eligibleToClaim || claimingDaily}
                  title={
                    !dailyStatus.eligibleToClaim
                      ? `Watch ${Math.max(0, dailyStatus.videosRequired - dailyStatus.videosCompletedToday)} more eligible video(s) today to unlock claim`
                      : 'Claim today’s daily reward'
                  }
                  className="btn-primary w-full sm:w-auto"
                >
                  <Gift className="w-4 h-4" />
                  <span>{claimingDaily ? 'Claiming…' : 'Claim Daily Reward'}</span>
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Requirement #2 & #4 & #6: ALL 10 Videos in Two-Column Mobile-Friendly Grid (no video hidden!) */}
      <section className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Video Campaigns ({homeVideos.length})
            </h3>
            <p className="text-xs text-slate-500">
              {lp && lp.videoLimit > 0
                ? `${lp.videoLimit} of ${homeVideos.length} campaigns unlocked on ${currentLevelLabel}. Upgrade to unlock more.`
                : 'Activate Level 1 or a membership plan to unlock video campaigns and earn USD.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate?.('videos')}
            className="btn-secondary !h-9"
          >
            <span>Open Full Library</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingVideos ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-56 rounded-2xl skeleton-shimmer border border-slate-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {homeVideos.map((video, idx) => {
              const isUnlocked = Boolean(video.hasAccess);
              return (
                <div
                  key={video.id}
                  onClick={() => {
                    if (isUnlocked) navigate?.('player', { videoId: video.id });
                    else setLockedModalVideo(video);
                  }}
                  className="group card-white card-hover overflow-hidden flex flex-col justify-between cursor-pointer"
                >
                  {/* Video Poster */}
                  <div className="relative aspect-video bg-slate-900 overflow-hidden">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      loading="lazy"
                      className={`w-full h-full object-cover transition-transform duration-300 ${
                        isUnlocked ? 'group-hover:scale-105 opacity-95' : 'opacity-45'
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent" />

                    {/* Top badges */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/95 text-slate-900">
                        #{idx + 1} · {formatAccountLevelLabel(video.minAccountLevel || 'LEVEL_1')}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-950/80 text-white flex items-center gap-0.5 tabular-nums">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDurationMMSS(video.durationSeconds)}
                      </span>
                    </div>

                    {/* Center Play or Lock */}
                    {isUnlocked ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-600/95 group-hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
                          <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
                        </span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 text-center gap-1">
                        <span className="w-9 h-9 rounded-full bg-white/15 border border-white/30 text-white flex items-center justify-center">
                          <Lock className="w-4 h-4" />
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-bold text-white leading-tight">
                          Locked
                        </span>
                      </div>
                    )}

                    {/* Bottom status / reward */}
                    {video.isWatched && (
                      <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Done
                      </span>
                    )}
                    {video.rewardEligible && (
                      <span className="absolute bottom-2 right-2 text-[10px] font-bold text-white bg-slate-900/90 border border-white/15 px-2 py-0.5 rounded tabular-nums">
                        {video.rewardPercentageBps && video.rewardPercentageBps > 0
                          ? `${(video.rewardPercentageBps / 100).toFixed(2)}%`
                          : `+${formatUSD(video.rewardAmountCents)}`}
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between gap-2.5">
                    <div className="space-y-0.5">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                        {video.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{video.category}</p>
                    </div>

                    {isUnlocked ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate?.('player', { videoId: video.id });
                        }}
                        className="btn-primary !h-8 sm:!h-9 w-full !text-[11px]"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>{video.isWatched ? 'Watch Again' : 'Watch'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLockedModalVideo(video);
                        }}
                        className="btn-secondary !h-8 sm:!h-9 w-full !text-[11px]"
                      >
                        <Lock className="w-3 h-3 text-slate-500" />
                        <span>Unlock Level</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Requirement #4: Locked Video -> "Increase Your Account Level" Modal with Upgrade Button -> Plans Page */}
      {lockedModalVideo && (
        <div
          onClick={() => setLockedModalVideo(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 p-6 space-y-5 shadow-2xl relative animate-modal-in text-center"
          >
            <button
              type="button"
              onClick={() => setLockedModalVideo(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-extrabold text-slate-900">
                Increase Your Account Level
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>&ldquo;{lockedModalVideo.title}&rdquo;</strong> is locked on your current tier ({currentLevelLabel} — {lp?.videoLimit ?? 0} videos allowed). Upgrade your account level or select a higher plan to unlock this campaign.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setLockedModalVideo(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setLockedModalVideo(null);
                  navigate?.('packages');
                }}
                className="btn-primary flex-1"
              >
                <span>Upgrade Plan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zero-Flash Transfer to Main Modal (#9) */}
      {transferSource && (
        <div
          onClick={() => !transferring && setTransferSource(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full border border-slate-200 p-6 space-y-5 shadow-2xl relative animate-modal-in"
          >
            <button
              type="button"
              onClick={() => setTransferSource(null)}
              disabled={transferring}
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
                    <span>{transferSuccess.msg}</span>
                  </div>
                  <div className="pl-6 text-emerald-800">
                    Updated Main Account balance:{' '}
                    <strong className="tabular-nums">{formatUSD(transferSuccess.updatedMainCents)}</strong>
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
            ) : transferring ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="text-xs font-semibold text-slate-600">Completing instant transfer…</div>
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
                    disabled={!(parseFloat(transferAmountInput) > 0)}
                    className="btn-primary flex-1"
                  >
                    <span>Confirm Transfer</span>
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
