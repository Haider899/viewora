import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Package, PackagePurchase } from '../types/index.js';
import { useToast } from '../components/ToastProvider.js';
import { HALAL_AD_SHARE_STATEMENT } from '../components/CompanyInfoModal.js';
import { formatUSD } from '../utils/formatters.js';
import {
  Check,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  X,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface PackagesProps {
  navigate?: (route: string) => void;
  autoSelectTier?: string | null;
  onAutoSelectHandled?: () => void;
}

export const PackagesPage: React.FC<PackagesProps> = ({
  navigate,
  autoSelectTier,
  onAutoSelectHandled,
}) => {
  const { user, wallet, refreshWallet, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [packages, setPackages] = useState<Package[]>([]);
  const [activePurchase, setActivePurchase] = useState<PackagePurchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentSource, setPaymentSource] = useState<'COMBINED' | 'EARNINGS' | 'SUBSCRIPTION_CREDIT'>('COMBINED');
  const [successInfo, setSuccessInfo] = useState<{
    msg: string;
    remainingCents: number;
    breakdownText?: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPackagesData = async () => {
    setLoading(true);
    try {
      const [pkgRes, activeRes] = await Promise.all([
        api.getPackages(),
        user ? api.getMyActivePackage() : Promise.resolve({ success: false, data: null }),
      ]);
      if (pkgRes.success && pkgRes.data) setPackages(pkgRes.data);
      if (activeRes.success && activeRes.data) setActivePurchase(activeRes.data);
    } catch (err) {
      console.error('Failed to load packages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackagesData();
  }, [user]);

  // Rule 9: When arriving directly from clicking a locked ad, open THAT exact package's checkout modal immediately!
  useEffect(() => {
    if (!autoSelectTier || loading || packages.length === 0) return;
    const needle = autoSelectTier.toLowerCase().trim();
    const matched = packages.find(
      (p) =>
        p.name.toLowerCase() === needle ||
        (p.levelKey && p.levelKey.toLowerCase() === needle)
    );
    if (matched && !matched.isCurrentPlan && !matched.isOwnedOrLower) {
      handleOpenPurchase(matched);
    }
    onAutoSelectHandled?.();
  }, [autoSelectTier, loading, packages]);

  const handleOpenPurchase = (pkg: Package) => {
    if (!user) {
      navigate?.('login');
      return;
    }
    setSelectedPackage(pkg);
    setPaymentSource('COMBINED');
    setErrorMsg(null);
    setSuccessInfo(null);
    setModalOpen(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedPackage || purchasing) return;
    const costCents = selectedPackage.isUpgrade
      ? (selectedPackage.upgradeDiffCents ?? selectedPackage.priceCents)
      : selectedPackage.priceCents;
    const availBefore = wallet?.USD?.availableCents ?? 0;
    const earningsBefore =
      wallet?.USD?.earningsTotalCents ??
      (wallet?.USD?.videoRewardsCents ?? 0) +
        (wallet?.USD?.referralCents ?? 0) +
        (wallet?.USD?.otherRewardsCents ?? 0);
    const expectedRemaining = Math.max(0, availBefore + earningsBefore - costCents);

    setPurchasing(true);
    setErrorMsg(null);
    try {
      const res = await api.purchasePackage(selectedPackage.id, 'USD', paymentSource);
      if (res.success && res.data) {
        const b = res.data.paymentBreakdown;
        const parts: string[] = [];
        if (b?.subscriptionCreditCents > 0) {
          parts.push(`${formatUSD(b.subscriptionCreditCents)} from Subscription Credit`);
        }
        const earnedUsed = (b?.videoRewardsCents || 0) + (b?.referralCents || 0) + (b?.bonusesCents || 0);
        if (earnedUsed > 0) {
          parts.push(`${formatUSD(earnedUsed)} from Withdrawable Earnings`);
        }
        setSuccessInfo({
          msg: selectedPackage.isUpgrade
            ? `Upgraded to ${selectedPackage.name} Lifetime Plan! Higher-level ads are now unlocked.`
            : `${selectedPackage.name} Lifetime Plan is now active on your account.`,
          remainingCents: expectedRemaining,
          breakdownText: parts.length > 0 ? `Paid: ${parts.join(' + ')}` : undefined,
        });
        showToast(
          selectedPackage.isUpgrade
            ? `Upgraded to ${selectedPackage.name} plan!`
            : `${selectedPackage.name} plan activated!`,
          'success'
        );
        await Promise.all([refreshWallet(), refreshUser(), fetchPackagesData()]);
      } else {
        setErrorMsg(res.error?.message || 'Unable to activate plan.');
      }
    } catch {
      setErrorMsg('Network error activating plan.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-slate-900">Lifetime Packages (USD)</h2>
          <p className="text-xs text-slate-500">
            Pay once and stay a member for life. Upgrading charges only the price difference between your current plan and the new tier.
          </p>
        </div>
        {activePurchase && (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs font-bold shrink-0">
            <CheckCircle2 className="w-4 h-4 text-orange-600" />
            <span>
              Active Lifetime Plan: {activePurchase.packageName}
            </span>
          </div>
        )}
      </div>

      {/* Halal 95% Advertiser Revenue Share Banner (Part 1 Rule 2) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#FFF3E6] to-amber-50/40 border border-orange-200/80 space-y-2">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-orange-700">
          <ShieldCheck className="w-4 h-4 text-orange-600" />
          <span>How Your Earnings Work (Halal 95% Ad-Revenue Share)</span>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed font-medium">
          {HALAL_AD_SHARE_STATEMENT}
        </p>
      </div>

      {/* Package Cards — 100% Dynamic Figures from Admin Package Settings (Part 5 #6 & #7) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-96 rounded-2xl skeleton-shimmer border border-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {packages.map((pkg) => {
            const isCurrent = Boolean(pkg.isCurrentPlan || activePurchase?.packageId === pkg.id);
            const isOwnedOrLower = Boolean(pkg.isOwnedOrLower);
            const isUpgrade = Boolean(pkg.isUpgrade);
            const upgradeDiffCents = pkg.upgradeDiffCents ?? pkg.priceCents;
            const isRecommended = pkg.name === 'Premium';
            const adsCount = pkg.unlockedAdsCount ?? pkg.videoLimit;
            const perAdCents = pkg.perVideoRewardCents ?? 50;

            return (
              <div
                key={pkg.id}
                className={`rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 relative bg-white ${
                  isCurrent
                    ? 'border-2 border-orange-500 shadow-md ring-4 ring-orange-500/10'
                    : isRecommended
                    ? 'border-2 border-orange-400 shadow-md'
                    : 'border border-slate-200 shadow-2xs card-hover'
                }`}
              >
                {isRecommended && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs whitespace-nowrap">
                    Recommended
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">{pkg.name}</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                        {(pkg.levelKey || 'LEVEL_1').replace('_', ' ')} · Lifetime
                      </span>
                    </div>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-bold shrink-0">
                        Active
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-slate-900 tabular-nums">
                        {formatUSD(pkg.priceCents)}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">one-time</span>
                    </div>
                    {isUpgrade && (
                      <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold tabular-nums">
                        <Sparkles className="w-3 h-3" />
                        Upgrade cost: {formatUSD(upgradeDiffCents)} (difference only)
                      </div>
                    )}
                  </div>

                  {/* Complete Dynamic Package Benefits Table (Part 5 #6 & #7) */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Validity</span>
                      <span className="font-extrabold text-emerald-700">Lifetime</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Daily Ads Access</span>
                      <span className="font-extrabold text-slate-900 tabular-nums">{adsCount} ads</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Reward per Ad</span>
                      <span className="font-extrabold text-orange-600 tabular-nums">
                        {formatUSD(perAdCents)} / ad
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Referral Commission</span>
                      <span className="font-extrabold text-slate-900">
                        {pkg.referralRateRange || '5%–15%'}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-1.5 pt-0.5">
                    {[
                      `Unlocks ${adsCount} ads (${(pkg.levelKey || 'LEVEL_1').replace('_', ' ')} & below)`,
                      `Earn ${formatUSD(perAdCents)} per verified ad watch (8 PM – 7:59 PM cycle)`,
                      `Lifetime membership — watch ads and keep earning`,
                      `95% halal advertiser revenue share`,
                    ].map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] text-slate-600 leading-snug">
                        <Check className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-5">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="btn-secondary w-full border-orange-200 text-orange-700"
                    >
                      Current Lifetime Plan
                    </button>
                  ) : isOwnedOrLower ? (
                    <button type="button" disabled className="btn-secondary w-full">
                      Included in Your Tier
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenPurchase(pkg)}
                      className="btn-primary w-full"
                    >
                      <span>
                        {isUpgrade
                          ? `Upgrade for ${formatUSD(upgradeDiffCents)}`
                          : `Subscribe (${formatUSD(pkg.priceCents)})`}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Subscribe / Upgrade Checkout Dialog (Charges Difference Only on Upgrade!) */}
      {modalOpen && selectedPackage && (
        <div
          onClick={() => !purchasing && setModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 space-y-5 shadow-2xl relative animate-modal-in"
          >
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={purchasing}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 pr-8">
              <div className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">
                {selectedPackage.isUpgrade ? 'Package Upgrade (Pay Difference Only)' : 'Lifetime Plan Activation'}
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">{selectedPackage.name} Plan</h3>
              <p className="text-xs text-slate-500">
                Lifetime subscription · Unlocks {selectedPackage.unlockedAdsCount ?? selectedPackage.videoLimit} ads ({formatUSD(selectedPackage.perVideoRewardCents ?? 50)}/ad).
              </p>
            </div>

            {(() => {
              if (successInfo) {
                return (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1.5">
                      <div className="flex items-center gap-2 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{successInfo.msg}</span>
                      </div>
                      {successInfo.breakdownText && (
                        <div className="text-[11px] font-semibold text-emerald-800 pl-6">
                          {successInfo.breakdownText}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setModalOpen(false);
                          navigate?.('videos');
                        }}
                        className="btn-primary flex-1"
                      >
                        Watch Ads Now
                      </button>
                    </div>
                  </div>
                );
              }

              if (purchasing) {
                return (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-9 h-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <div className="text-xs font-bold text-slate-800">
                      {selectedPackage.isUpgrade ? 'Upgrading' : 'Activating'} your {selectedPackage.name} plan…
                    </div>
                  </div>
                );
              }

              const isUpgrade = Boolean(selectedPackage.isUpgrade);
              const reqCents = isUpgrade
                ? (selectedPackage.upgradeDiffCents ?? selectedPackage.priceCents)
                : selectedPackage.priceCents;
              const creditCents = selectedPackage.currentPlanPriceCents ?? 0;
              const subCreditCents = wallet?.USD?.availableCents ?? 0;
              const earnedCents =
                wallet?.USD?.earningsTotalCents ??
                (wallet?.USD?.videoRewardsCents ?? 0) +
                  (wallet?.USD?.referralCents ?? 0) +
                  (wallet?.USD?.otherRewardsCents ?? 0);

              const availableForSource =
                paymentSource === 'SUBSCRIPTION_CREDIT'
                  ? subCreditCents
                  : paymentSource === 'EARNINGS'
                  ? earnedCents
                  : subCreditCents + earnedCents;

              const hasEnough = availableForSource >= reqCents;
              const shortfallCents = Math.max(0, reqCents - availableForSource);

              // Exact preview split of what will be deducted from where (Part 4 #3)
              const willUseSubCents =
                paymentSource === 'EARNINGS' ? 0 : Math.min(subCreditCents, reqCents);
              const willUseEarnedCents =
                paymentSource === 'SUBSCRIPTION_CREDIT'
                  ? 0
                  : Math.min(earnedCents, Math.max(0, reqCents - willUseSubCents));

              return (
                <div className="space-y-4">
                  {/* Payment Source Selector (Part 4 #3: Earnings, Subscription Credit, or Combined) */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Choose Payment Source
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          id: 'EARNINGS' as const,
                          label: 'Earnings',
                          bal: earnedCents,
                        },
                        {
                          id: 'SUBSCRIPTION_CREDIT' as const,
                          label: 'Deposit Credit',
                          bal: subCreditCents,
                        },
                        {
                          id: 'COMBINED' as const,
                          label: 'Both Combined',
                          bal: subCreditCents + earnedCents,
                        },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setPaymentSource(opt.id);
                            setErrorMsg(null);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            paymentSource === opt.id
                              ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500/15'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-[10px] font-extrabold text-slate-900 leading-tight">
                            {opt.label}
                          </div>
                          <div className="text-[11px] font-black text-orange-600 tabular-nums mt-0.5">
                            {formatUSD(opt.bal)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>{selectedPackage.name} full price</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {formatUSD(selectedPackage.priceCents)}
                      </span>
                    </div>
                    {isUpgrade && creditCents > 0 && (
                      <div className="flex justify-between items-center text-emerald-700 font-semibold">
                        <span>Credit for {selectedPackage.currentPlanName || 'current plan'}</span>
                        <span className="tabular-nums">-{formatUSD(creditCents)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                      <span>{isUpgrade ? 'Upgrade difference due' : 'Subscription payment due'}</span>
                      <span className="text-orange-600 tabular-nums">{formatUSD(reqCents)}</span>
                    </div>
                    {hasEnough && (
                      <div className="pt-1.5 border-t border-slate-200 space-y-1 text-[11px] text-slate-600">
                        {willUseSubCents > 0 && (
                          <div className="flex justify-between">
                            <span>Paid from Deposit Credit</span>
                            <span className="font-bold text-slate-900 tabular-nums">
                              {formatUSD(willUseSubCents)}
                            </span>
                          </div>
                        )}
                        {willUseEarnedCents > 0 && (
                          <div className="flex justify-between">
                            <span>Paid from Withdrawable Earnings</span>
                            <span className="font-bold text-orange-700 tabular-nums">
                              {formatUSD(willUseEarnedCents)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {!hasEnough ? (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                        <span>
                          Deposit <strong className="tabular-nums">{formatUSD(shortfallCents)}</strong> to complete your {isUpgrade ? 'upgrade' : 'subscription'}. Note: package payments are one-time lifetime subscriptions and are non-withdrawable.
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setModalOpen(false)}
                          className="btn-secondary flex-1"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setModalOpen(false);
                            navigate?.('deposit');
                          }}
                          className="btn-primary flex-1"
                        >
                          Deposit {formatUSD(shortfallCents)}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {errorMsg && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{errorMsg}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setModalOpen(false)}
                          disabled={purchasing}
                          className="btn-secondary flex-1"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmPurchase}
                          disabled={purchasing}
                          className="btn-primary flex-1"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>{isUpgrade ? `Upgrade (${formatUSD(reqCents)})` : 'Confirm & Activate'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
