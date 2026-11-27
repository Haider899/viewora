import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { ReferralRankProgress } from '../types/index.js';
import { useToast } from '../components/ToastProvider.js';
import { formatDate, formatDateTime, formatUSD, maskEmail } from '../utils/formatters.js';
import {
  Users,
  Copy,
  Check,
  CheckCircle2,
  TrendingUp,
  Share2,
  Award,
  Target,
  Gift,
  GitBranch,
  Clock,
  Lock,
} from 'lucide-react';

interface ReferralsProps {
  navigate?: (route: string) => void;
}

const DEFAULT_POSITIONS = [
  { label: '1st Referral', ratePercent: 5, minPos: 1, maxPos: 1 },
  { label: '2nd Referral', ratePercent: 7, minPos: 2, maxPos: 2 },
  { label: '3rd Referral', ratePercent: 10, minPos: 3, maxPos: 3 },
  { label: '4th Referral', ratePercent: 12, minPos: 4, maxPos: 4 },
  { label: '5th+ Referrals', ratePercent: 15, minPos: 5, maxPos: 999999 },
];

export const ReferralsPage: React.FC<ReferralsProps> = () => {
  const { user } = useAuth();
  const { referralBannerImageUrl } = useTheme();
  const { showToast } = useToast();

  const [data, setData] = useState<any>(null);
  const [rankProgress, setRankProgress] = useState<ReferralRankProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        const [summaryRes, rankRes] = await Promise.all([
          api.getReferralSummary(),
          api.getReferralRankProgress(),
        ]);
        if (summaryRes.success && summaryRes.data) setData(summaryRes.data);
        if (rankRes.success && rankRes.data) setRankProgress(rankRes.data);
      } catch (err) {
        console.error('Failed to load referral summary:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReferralData();
  }, []);

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    showToast(type === 'code' ? 'Referral code copied.' : 'Invitation link copied.', 'success');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const dynamicPositions = (() => {
    const cfg = data?.referralConfig;
    if (cfg?.commissionRates) {
      const r = cfg.commissionRates;
      return [
        { label: '1st Referral', ratePercent: Number(r.pos1 ?? 5), minPos: 1, maxPos: 1 },
        { label: '2nd Referral', ratePercent: Number(r.pos2 ?? 7), minPos: 2, maxPos: 2 },
        { label: '3rd Referral', ratePercent: Number(r.pos3 ?? 10), minPos: 3, maxPos: 3 },
        { label: '4th Referral', ratePercent: Number(r.pos4 ?? 12), minPos: 4, maxPos: 4 },
        { label: '5th+ Referrals', ratePercent: Number(r.pos5 ?? 15), minPos: 5, maxPos: 999999 },
      ];
    }
    return DEFAULT_POSITIONS;
  })();

  const documentedRanks = (() => {
    const cfg = data?.referralConfig;
    if (Array.isArray(cfg?.ranks) && cfg.ranks.length > 0) return cfg.ranks;
    return [
      { key: 'NEW', name: 'New', minQualified: 0, maxQualified: 0, milestoneAt: 0, milestoneRewardUSD: 0 },
      { key: 'GOLD', name: 'Gold', minQualified: 1, maxQualified: 5, milestoneAt: 5, milestoneRewardUSD: 20 },
      { key: 'PLATINUM', name: 'Platinum', minQualified: 6, maxQualified: 10, milestoneAt: 10, milestoneRewardUSD: 100 },
      { key: 'DIAMOND', name: 'Diamond', minQualified: 11, maxQualified: 100, milestoneAt: 100, milestoneRewardUSD: 500 },
      { key: 'RANK_4', name: 'Rank 4', minQualified: 101, maxQualified: 500, milestoneAt: 500, milestoneRewardUSD: 1000 },
      { key: 'RANK_5', name: 'Rank 5', minQualified: 501, maxQualified: 10000, milestoneAt: 1000, milestoneRewardUSD: 2500 },
    ];
  })();

  const qualifiedCount = rankProgress?.qualifiedReferrals ?? data?.qualifiedReferrals ?? 0;

  // Issue #7: ONLY mark a milestone Achieved when its real claim payment exists!
  const claimedRankKeys = new Set(
    (rankProgress?.milestoneClaims || []).map((c: any) => String(c.rankName || '').toUpperCase())
  );

  // Compute single consistent current rank & next milestone directly from admin config
  const currentRankObj =
    [...documentedRanks]
      .reverse()
      .find((r: any) => qualifiedCount >= (r.minQualified ?? 0)) || documentedRanks[0];

  const nextMilestoneRank = documentedRanks.find(
    (r: any) =>
      (r.milestoneAt ?? 0) > 0 &&
      (r.milestoneRewardUSD ?? 0) > 0 &&
      !claimedRankKeys.has(String(r.key || r.name || '').toUpperCase())
  );

  const nextTargetCount = nextMilestoneRank?.milestoneAt ?? currentRankObj?.milestoneAt ?? 5;
  const remainingCount = Math.max(0, nextTargetCount - qualifiedCount);
  const progressPercent = nextMilestoneRank
    ? Math.min(99, Math.round((qualifiedCount / Math.max(1, nextTargetCount)) * 100))
    : 100;

  const nextReferralPos = qualifiedCount + 1;

  // Issue #15: Never render false zeros or empty states before real data arrives
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-52 rounded-2xl skeleton-shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="h-28 rounded-2xl skeleton-shimmer" />
          <div className="h-28 rounded-2xl skeleton-shimmer" />
          <div className="h-28 rounded-2xl skeleton-shimmer" />
        </div>
        <div className="h-44 rounded-2xl skeleton-shimmer" />
      </div>
    );
  }

  const stableReferralCode = user?.referralCode || data?.referralCode || '';
  const stableReferralLink = stableReferralCode
    ? `${window.location.origin}/signup?ref=${encodeURIComponent(stableReferralCode)}`
    : data?.referralLink || '';

  return (
    <div className="space-y-6">
      {/* Part 5e: Admin-configurable Referrals Promotional Banner Image */}
      {referralBannerImageUrl && (
        <div className="rounded-2xl overflow-hidden border border-orange-200/80 shadow-sm bg-white">
          <img
            src={referralBannerImageUrl}
            alt="U-ADS Referral Program"
            className="w-full max-h-56 object-cover"
          />
        </div>
      )}

      {/* Unified Single-Truth Rank Progress Card */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white p-6 shadow-md border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <Award className="w-4 h-4" />
              <span>Current Referral Rank</span>
            </div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-3xl font-black tracking-tight">{currentRankObj.name}</h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Active
              </span>
            </div>
          </div>

          {nextMilestoneRank && (
            <div className="px-4 py-3 rounded-xl bg-white/10 border border-white/10 flex items-center gap-3">
              <Gift className="w-6 h-6 text-emerald-300 shrink-0" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">
                  Next Milestone Bonus
                </div>
                <div className="text-lg font-extrabold text-white tabular-nums">
                  +${nextMilestoneRank.milestoneRewardUSD}.00 USD
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clear Single Progress Message */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
            <span className="text-slate-200">
              {nextMilestoneRank
                ? `Next milestone: ${nextMilestoneRank.name} ($${nextMilestoneRank.milestoneRewardUSD} bonus) — ${remainingCount} more qualified referral${
                    remainingCount === 1 ? '' : 's'
                  } needed`
                : 'All rank milestones achieved!'}
            </span>
            <span className="text-emerald-300 tabular-nums">
              {qualifiedCount} / {nextTargetCount} qualified ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Milestone Ladder with Paid-Verified Achieved / In Progress / Locked states (#7 & #17b) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-white/10">
          {documentedRanks.map((rk: any) => {
            const rankKey = String(rk.key || rk.name || '').toUpperCase();
            const displayName = rk.name || (rankKey === 'RANK_4' ? 'Rank 4' : rankKey === 'RANK_5' ? 'Rank 5' : rankKey);
            const isPaidMilestone = rk.milestoneAt > 0 && claimedRankKeys.has(rankKey);
            const isBaseRankReached = rk.milestoneAt === 0 && qualifiedCount >= (rk.minQualified ?? 0);
            const isAchieved = isPaidMilestone || isBaseRankReached;
            const isInProgress = nextMilestoneRank?.key === rk.key;
            const statusLabel = isAchieved ? 'Achieved' : isInProgress ? 'In progress' : 'Locked';

            return (
              <div
                key={rk.key || rk.name}
                className={`p-3 rounded-xl border text-left space-y-1 ${
                  isInProgress
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-white'
                    : isAchieved
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-white/5 border-white/10 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-extrabold">{displayName}</span>
                  {isAchieved ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : isInProgress ? (
                    <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  ) : (
                    <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                  )}
                </div>
                <div className="text-[11px] opacity-80 tabular-nums">
                  {rk.minQualified === 0 && rk.maxQualified === 0
                    ? '0 qualified'
                    : `${rk.minQualified}–${rk.maxQualified.toLocaleString()} qual.`}
                </div>
                <div className="text-[10px] font-bold text-emerald-300">
                  {rk.milestoneRewardUSD > 0 ? `+$${rk.milestoneRewardUSD} at ${rk.milestoneAt} · ${statusLabel}` : statusLabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card-white p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Invited</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {loading ? '—' : data?.totalReferrals ?? 0}
          </div>
          <p className="text-xs text-slate-400">Direct registered members</p>
        </div>

        <div className="card-white p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Qualified Referrals</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {loading ? '—' : qualifiedCount}
          </div>
          <p className="text-xs text-slate-400">Completed first qualifying USD plan</p>
        </div>

        <div className="card-white p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Commissions Earned</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-700 tabular-nums">
            {formatUSD(data?.totalCommissionCents ?? 0)}
          </div>
          <p className="text-xs text-slate-400">
            Credited every day at 8:00 PM
            {(data?.todayPendingCommissionCents ?? 0) > 0 && (
              <span className="block font-bold text-orange-600 mt-0.5 tabular-nums">
                Today Commission: +{formatUSD(data.todayPendingCommissionCents)}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Share Link & Code (Part 5b: Single permanent Referral Code & Link) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card-white p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Share2 className="w-4 h-4 text-emerald-600" />
            <span>Your Invitation Link</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-10 px-3 rounded-[10px] bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700 flex items-center truncate">
              <span className="truncate">{stableReferralLink || '—'}</span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(stableReferralLink, 'link')}
              className="btn-primary shrink-0"
            >
              {copiedType === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedType === 'link' ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        <div className="card-white p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Share2 className="w-4 h-4 text-slate-500" />
            <span>Personal Referral Code</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-10 px-3 rounded-[10px] bg-slate-50 border border-slate-200 font-mono text-sm font-bold text-emerald-700 flex items-center">
              {stableReferralCode || '—'}
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(stableReferralCode, 'code')}
              className="btn-secondary shrink-0"
            >
              {copiedType === 'code' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedType === 'code' ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Position-Based Commission Table (Part 5d: Always show full 5-position table + cap note) */}
      <div className="card-white p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Commission Rates by Referral Position</h3>
            <p className="text-xs text-slate-500">
              {data?.referralConfig?.firstTransactionEnabled !== false && data?.referralConfig?.dailyCommissionEnabled !== false
                ? 'Applies to qualifying first-package commissions and daily 24h ad-earnings commissions (credited every day at 8:00 PM).'
                : data?.referralConfig?.firstTransactionEnabled !== false
                ? 'One-time commission credited when your referral activates their first qualifying package.'
                : 'Daily commission credited every day at 8:00 PM from your qualified referrals’ ad earnings.'}
              {data?.referralConfig?.maxCommissionReferrals > 0
                ? ` Commission applies up to your first ${data.referralConfig.maxCommissionReferrals} qualified referrals.`
                : ''}
            </p>
          </div>
          {(() => {
            const maxCap = Number(data?.referralConfig?.maxCommissionReferrals ?? 0);
            const capReached = maxCap > 0 && nextReferralPos > maxCap;
            const nextRate =
              dynamicPositions.find((p) => nextReferralPos >= p.minPos && nextReferralPos <= p.maxPos)?.ratePercent ??
              dynamicPositions[dynamicPositions.length - 1]?.ratePercent ??
              15;
            return capReached ? (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                Commission cap reached ({maxCap} referrals) · Milestones still active
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Your next referral earns {nextRate}%
              </span>
            );
          })()}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          {dynamicPositions.map((pos, idx) => {
            const maxCap = Number(data?.referralConfig?.maxCommissionReferrals ?? 0);
            const capReached = maxCap > 0 && nextReferralPos > maxCap;
            const beyondCap = maxCap > 0 && pos.minPos > maxCap;
            const isNext = !capReached && !beyondCap && nextReferralPos >= pos.minPos && nextReferralPos <= pos.maxPos;
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border text-center space-y-1 transition-all ${
                  isNext
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/15'
                    : beyondCap
                    ? 'bg-slate-50/70 border-slate-200 opacity-70'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className={`text-[11px] font-bold ${isNext ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {pos.label}
                </div>
                <div className={`text-xl font-black tabular-nums ${isNext ? 'text-emerald-700' : 'text-slate-900'}`}>
                  {pos.ratePercent}%
                </div>
                <div className="text-[10px] font-semibold text-slate-500">
                  {isNext ? 'Your next tier' : beyondCap ? `Limit: first ${maxCap}` : 'Commission rate'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Referral Network Tree (Per-child branch connectors, high-contrast root, masked emails!) */}
      <div className="card-white p-6 space-y-5">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Your Referral Network</h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {data?.referrals?.length ?? 0} direct member{(data?.referrals?.length ?? 0) === 1 ? '' : 's'}
          </span>
        </div>

        {/* Root Node */}
        <div className="space-y-0">
          <div className="inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-xs">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider">
              You
            </span>
            <div>
              <div className="text-xs font-bold">{user?.fullName}</div>
              <div className="text-[11px] text-slate-300">
                {currentRankObj.name} Rank · Code {data?.referralCode || user?.referralCode}
              </div>
            </div>
          </div>

          {/* Per-child Tree Branches */}
          {!data?.referrals || data.referrals.length === 0 ? (
            <div className="mt-4 p-8 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
              <div className="text-sm font-bold text-slate-900">No invited members yet</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Copy your invitation link above and share it with friends to start earning{' '}
                {dynamicPositions[0]?.ratePercent ?? 5}%–{dynamicPositions[dynamicPositions.length - 1]?.ratePercent ?? 15}% USD referral commissions.
              </p>
            </div>
          ) : (
            <div className="ml-5 pl-5 border-l-2 border-slate-200 pt-4 space-y-3">
              {data.referrals.map((ref: any, idx: number) => {
                // Part 5 #2: Single clear status per row — NEVER two contradictory labels!
                const position = ref.positionNumber ?? null;
                const isTrulyQualified = Boolean(ref.isQualified);
                const posObj = position ? dynamicPositions[Math.min(position - 1, dynamicPositions.length - 1)] : null;
                return (
                  <div key={ref.id || idx} className="relative">
                    {/* Horizontal branch connector */}
                    <span className="absolute -left-5 top-6 w-5 h-0.5 bg-slate-200" />
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 truncate">{ref.fullName}</span>
                          {isTrulyQualified && position !== null && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                              Position #{position} · {posObj?.ratePercent ?? 15}% tier
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {maskEmail(ref.email)} · Joined {formatDate(ref.createdAt)}
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 w-fit ${
                          isTrulyQualified
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {isTrulyQualified ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Qualified
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            Awaiting Qualification
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Commission History */}
      <div className="card-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Commission History</h3>
          <span className="text-xs text-slate-500">{data?.commissions?.length ?? 0} payouts</span>
        </div>

        {!data?.commissions || data.commissions.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No referral commissions credited yet. When your invited members purchase their first qualifying USD plan, your commission appears here automatically.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.commissions.map((comm: any) => (
              <div key={comm.id} className="px-5 py-3.5 flex items-center justify-between gap-4 text-xs">
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span>{comm.sourceUserName}</span>
                    {comm.positionNumber && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Position #{comm.positionNumber}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    {comm.ratePercent}% commission · {formatDateTime(comm.createdAt)}
                  </div>
                </div>
                <span className="font-extrabold text-emerald-600 text-sm tabular-nums">
                  +{formatUSD(comm.commissionCents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
