import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { LedgerEntryItem, Package, PackagePurchase, Video } from '../types/index.js';
import {
  formatDateTime,
  formatDurationMMSS,
  formatUSD,
  groupLedgerEntries,
  getTonePillClass,
} from '../utils/formatters.js';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Play,
  Lock,
  Clock,
  CheckCircle2,
  Users,
  Gift,
  Sparkles,
  Layers,
  ChevronRight,
  Receipt,
  ShieldCheck,
} from 'lucide-react';

interface WalletPageProps {
  navigate: (route: string, state?: any) => void;
  referralRank?: string;
}

export const WalletPage: React.FC<WalletPageProps> = ({ navigate, referralRank = 'New' }) => {
  const { wallet, refreshWallet } = useAuth();

  const [videos, setVideos] = useState<Video[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [activePurchase, setActivePurchase] = useState<PackagePurchase | null>(null);
  const [entries, setEntries] = useState<LedgerEntryItem[]>([]);
  const [refSummary, setRefSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      try {
        const [vidRes, pkgRes, actRes, txRes, refRes] = await Promise.all([
          api.getVideos(),
          api.getPackages(),
          api.getMyActivePackage(),
          api.getTransactions(1, 20),
          api.getReferralSummary().catch(() => ({ success: false, data: null })),
        ]);
        if (!mounted) return;
        if (vidRes.success && Array.isArray(vidRes.data)) setVideos(vidRes.data);
        if (pkgRes.success && Array.isArray(pkgRes.data)) setPackages(pkgRes.data);
        if (actRes.success && actRes.data) setActivePurchase(actRes.data);
        if (txRes.success && txRes.data) setEntries(txRes.data.entries || []);
        if (refRes.success && refRes.data) setRefSummary(refRes.data);
      } catch {
        // silent
      } finally {
        if (mounted) setLoading(false);
      }
    };
    refreshWallet();
    loadAll();
    return () => {
      mounted = false;
    };
  }, []);

  // Part 1 Rule 3: ONLY show earned balances (NEVER paid-in deposit money!)
  const videoCents = wallet?.USD?.videoRewardsCents ?? 0;
  const referralCents = wallet?.USD?.referralCents ?? 0;
  const otherCents = wallet?.USD?.otherRewardsCents ?? 0;
  const totalEarningsCents = videoCents + referralCents + otherCents;

  const recentFive = useMemo(() => groupLedgerEntries(entries).slice(0, 5), [entries]);
  const unlockedCount = videos.filter((v) => v.hasAccess).length;
  const claimedTodayCount = videos.filter((v) => v.hasAccess && v.hasClaimedReward).length;

  return (
    <div className="space-y-6">
      {/* 1. FIRST SCREEN: Earnings Balances + Deposit / Withdraw Buttons (Nothing above them!) */}
      <section className="rounded-3xl bg-gradient-to-br from-[#FFF3E6] via-white to-[#FFF8F1] border border-orange-200/80 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-orange-700">
              Your Withdrawable Earnings (USD)
            </div>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 tabular-nums tracking-tight">
              {wallet ? formatUSD(totalEarningsCents) : '—'}
            </div>
            <p className="text-[11px] text-slate-500">
              Earned from watching ads, referrals &amp; bonuses · 95% of advertiser ad revenue shared with members (Halal).
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => navigate('deposit')}
              className="btn-primary !h-11 !px-5 !rounded-xl flex-1 sm:flex-initial"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Deposit</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('withdrawal')}
              className="btn-secondary !h-11 !px-5 !rounded-xl border-orange-300 text-slate-900 hover:bg-orange-50 flex-1 sm:flex-initial"
            >
              <ArrowUpRight className="w-4 h-4 text-orange-600" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>

        {/* 3 Compact Earnings Sub-Cards (Video Ad Rewards, Referral Earnings, Bonuses) */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-white border border-orange-100 shadow-2xs">
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate">
              Video Ad Rewards
            </div>
            <div
              className={`text-base sm:text-xl font-black tabular-nums mt-0.5 ${
                videoCents > 0 ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              {formatUSD(videoCents)}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white border border-orange-100 shadow-2xs">
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate">
              Referral Earnings
            </div>
            <div
              className={`text-base sm:text-xl font-black tabular-nums mt-0.5 ${
                referralCents > 0 ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              {formatUSD(referralCents)}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white border border-orange-100 shadow-2xs">
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate">
              Bonuses
            </div>
            <div
              className={`text-base sm:text-xl font-black tabular-nums mt-0.5 ${
                otherCents > 0 ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              {formatUSD(otherCents)}
            </div>
          </div>
        </div>
      </section>

      {/* 2. ONE SMALL COMBINED STRIP: Referrals & Earnings Summaries + 3 Quick Buttons (Totals Only, No Tables!) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card-white p-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-orange-500" />
              <span>Referrals ({referralRank})</span>
            </div>
            <div className="text-lg font-black text-slate-900 tabular-nums">
              {refSummary?.qualifiedReferrals ?? 0} Qualified{' '}
              <span className="text-xs font-semibold text-slate-400">
                / {refSummary?.totalReferrals ?? 0} Total
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('referrals')}
            className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-[11px] font-bold shrink-0 cursor-pointer"
          >
            View My Referrals
          </button>
        </div>

        <div className="card-white p-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>Total Commissions</span>
            </div>
            <div className="text-lg font-black text-emerald-700 tabular-nums">
              {formatUSD(refSummary?.totalCommissionCents ?? referralCents)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('referrals')}
            className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-[11px] font-bold shrink-0 cursor-pointer"
          >
            View My Commissions
          </button>
        </div>

        <div className="card-white p-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-orange-500" />
              <span>Bonuses Earned</span>
            </div>
            <div className="text-lg font-black text-slate-900 tabular-nums">
              {formatUSD(otherCents)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('transactions')}
            className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-[11px] font-bold shrink-0 cursor-pointer"
          >
            View Bonuses
          </button>
        </div>
      </section>

      {/* 3. "INVEST HERE" COMPACT PACKAGES SECTION */}
      <section className="card-white p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-600" />
              <span>Invest Here — Lifetime Packages</span>
            </h2>
            <p className="text-[11px] text-slate-500">
              {activePurchase
                ? `Active Plan: ${activePurchase.packageName} (Lifetime) · Upgrade anytime by paying only the difference.`
                : 'Buy a lifetime package once to unlock daily ads and start earning — bigger packages pay more per ad.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('packages')}
            className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>All Packages</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {packages.map((pkg) => {
            const isCurrent = Boolean(pkg.isCurrentPlan || activePurchase?.packageId === pkg.id);
            const isOwnedOrLower = Boolean(pkg.isOwnedOrLower);
            const isUpgrade = Boolean(pkg.isUpgrade);
            const costCents = isUpgrade ? (pkg.upgradeDiffCents ?? pkg.priceCents) : pkg.priceCents;

            return (
              <div
                key={pkg.id}
                className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2.5 transition-all ${
                  isCurrent
                    ? 'bg-orange-50/70 border-orange-400 ring-2 ring-orange-500/15'
                    : 'bg-slate-50/70 border-slate-200 hover:border-orange-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold text-slate-900">{pkg.name}</span>
                    {isCurrent ? (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-orange-600 text-white">
                        Active
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                        Lifetime
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-black text-slate-900 tabular-nums">
                    {formatUSD(pkg.priceCents)}
                  </div>
                  <div className="text-[10px] text-slate-600 space-y-0.5">
                    <div>
                      <strong className="text-slate-800">{pkg.unlockedAdsCount ?? pkg.videoLimit}</strong> Ads ·{' '}
                      <strong className="text-emerald-700">{formatUSD(pkg.perVideoRewardCents ?? 50)}</strong>/ad
                    </div>
                  </div>
                </div>

                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-1.5 rounded-xl bg-white border border-orange-200 text-orange-700 text-[11px] font-bold cursor-default"
                  >
                    Current Plan
                  </button>
                ) : isOwnedOrLower ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-1.5 rounded-xl bg-slate-200/70 text-slate-500 text-[11px] font-bold cursor-default"
                  >
                    Included
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('packages', { autoSelectTier: pkg.name })}
                    className="w-full py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white text-[11px] font-bold cursor-pointer shadow-xs"
                  >
                    {isUpgrade ? `Upgrade (${formatUSD(costCents)})` : `Buy ${pkg.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. TODAY'S ADS (ALL PUBLISHED ADS — LOCKED ONES DARK GREY, 24H 8:00 PM CYCLE, "WATCH ADS" WORDING) */}
      <section className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Today&apos;s Ads ({videos.length})
            </h2>
            <p className="text-[11px] text-slate-500">
              Cycle: <strong>8:00 PM – 7:59:59 PM</strong> (unclaimed rewards expire daily) ·{' '}
              <strong className="text-orange-700">
                {claimedTodayCount}/{unlockedCount}
              </strong>{' '}
              unlocked ads claimed in this cycle
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('videos')}
            className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>Open Ads Page</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-56 rounded-2xl skeleton-shimmer border border-slate-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {videos.map((video) => {
              const isUnlocked = Boolean(video.hasAccess);
              const isClaimedThisCycle = Boolean(video.hasClaimedReward);

              if (!isUnlocked) {
                // Rule 6 & Rule 9: Locked video card is DARK GREY & DIMMED, names unlocking package, clicks DIRECTLY to buy that package!
                return (
                  <div
                    key={video.id}
                    onClick={() => navigate('packages', { autoSelectTier: video.minPackageTier })}
                    className="rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden flex flex-col justify-between opacity-85 hover:opacity-100 transition-all cursor-pointer group"
                  >
                    <div className="relative aspect-video bg-slate-900 overflow-hidden">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover grayscale opacity-35"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center p-2.5 text-center gap-1.5">
                        <div className="w-9 h-9 rounded-full bg-slate-700/90 border border-slate-500 text-slate-200 flex items-center justify-center">
                          <Lock className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-extrabold text-white leading-tight">
                          Locked · {video.minPackageTier} Plan
                        </span>
                        <span className="text-[10px] text-slate-300 font-semibold">
                          {(video.minAccountLevel || 'LEVEL_1').replace('_', ' ')} Required
                        </span>
                      </div>
                      <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950/85 text-slate-300 tabular-nums">
                        {formatDurationMMSS(video.durationSeconds)}
                      </span>
                    </div>

                    <div className="p-3 space-y-2.5 bg-slate-800 text-slate-200 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-slate-100 line-clamp-1">{video.title}</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                          Reward: {formatUSD(video.rewardAmountCents)} / ad
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('packages', { autoSelectTier: video.minPackageTier });
                        }}
                        className="w-full py-2 rounded-xl bg-slate-700 hover:bg-orange-600 text-slate-100 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Unlock {video.minPackageTier}</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={video.id}
                  className="card-white card-hover overflow-hidden flex flex-col justify-between"
                >
                  <div className="relative aspect-video bg-slate-900 overflow-hidden">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className={`w-full h-full object-cover ${isClaimedThisCycle ? 'opacity-65 grayscale-[40%]' : ''}`}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />

                    <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded bg-white/95 text-slate-900">
                      {video.minPackageTier}
                    </span>
                    <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950/80 text-white flex items-center gap-1 tabular-nums">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDurationMMSS(video.durationSeconds)}
                    </span>

                    {isClaimedThisCycle && (
                      <div className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Claimed
                      </div>
                    )}

                    <div className="absolute bottom-2 right-2 text-[11px] font-extrabold text-white bg-orange-600 px-2 py-0.5 rounded tabular-nums shadow-xs">
                      +{formatUSD(video.rewardAmountCents)}
                    </div>
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-900 line-clamp-1">
                        {video.title}
                      </h3>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                        {video.category}
                      </p>
                    </div>

                    {isClaimedThisCycle ? (
                      // Rule 8: Once claimed in this 8 PM–7:59:59 PM cycle, button turns GREY and disabled (NO "Watch Again")!
                      <button
                        type="button"
                        disabled
                        className="w-full h-9 rounded-xl bg-slate-200 text-slate-500 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-not-allowed"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Claimed (Next 8 PM)</span>
                      </button>
                    ) : (
                      // Rule 7: Every watch button reads "Watch Ads"
                      <button
                        type="button"
                        onClick={() => navigate('player', { videoId: video.id })}
                        className="btn-primary w-full !h-9 !text-[11px]"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Watch Ads</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. RECENT ACTIVITY: Last 5 Entries + "View All" Button (Part 2 #5) */}
      <section className="card-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-orange-600" />
            <h3 className="text-sm font-extrabold text-slate-900">Recent Activity</h3>
          </div>
          <button
            type="button"
            onClick={() => navigate('transactions')}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-700 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            View All
          </button>
        </div>

        {recentFive.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No activity yet. Subscribe to a lifetime package and watch ads to start earning!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentFive.map((row) => (
              <div
                key={row.id}
                className="px-5 py-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/70"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">{row.label}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTonePillClass(
                        row.tone
                      )}`}
                    >
                      {row.walletLabel}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{row.description}</div>
                  <div className="text-[10px] text-slate-400">{formatDateTime(row.createdAt)}</div>
                </div>
                <div
                  className={`font-extrabold tabular-nums shrink-0 ${
                    row.tone === 'error'
                      ? 'text-rose-600'
                      : row.signedCents > 0
                      ? 'text-emerald-600'
                      : 'text-slate-900'
                  }`}
                >
                  {formatUSD(row.signedCents, true)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Halal Revenue Transparency Footer Strip */}
      <div className="p-4 rounded-2xl bg-[#FFF6EE] border border-orange-100 flex items-start gap-3 text-xs text-slate-700">
        <ShieldCheck className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-900">100% Transparent Halal Ad-Revenue Share:</strong>{' '}
          Advertisers pay U-Ads to show their ads, and <strong>95%</strong> is shared with members who watch them. Bigger lifetime packages earn a larger share per ad.
        </p>
      </div>
    </div>
  );
};
