import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Package, PackagePurchase } from '../types/index.js';
import { useToast } from '../components/ToastProvider.js';
import { formatUSD } from '../utils/formatters.js';
import {
  Check,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  X,
} from 'lucide-react';

interface PackagesProps {
  navigate?: (route: string) => void;
}

export const PackagesPage: React.FC<PackagesProps> = ({ navigate }) => {
  const { user, wallet, refreshWallet } = useAuth();
  const { showToast } = useToast();

  const [packages, setPackages] = useState<Package[]>([]);
  const [activePurchase, setActivePurchase] = useState<PackagePurchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ msg: string; remainingCents: number } | null>(null);
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

  const handleOpenPurchase = (pkg: Package) => {
    if (!user) {
      navigate?.('login');
      return;
    }
    setSelectedPackage(pkg);
    setErrorMsg(null);
    setSuccessInfo(null);
    setModalOpen(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedPackage || purchasing) return;
    const availBefore = wallet?.USD?.availableCents ?? 0;
    const expectedRemaining = Math.max(0, availBefore - selectedPackage.priceCents);
    setPurchasing(true);
    setErrorMsg(null);
    try {
      const res = await api.purchasePackage(selectedPackage.id, 'USD');
      if (res.success && res.data) {
        // Set success state BEFORE refreshWallet() so "insufficient balance" NEVER flashes (#9)
        setSuccessInfo({
          msg: `${selectedPackage.name} plan is now active on your account.`,
          remainingCents: expectedRemaining,
        });
        showToast(`${selectedPackage.name} plan activated!`, 'success');
        await Promise.all([refreshWallet(), fetchPackagesData()]);
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
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-slate-900">Membership Plans (USD)</h2>
          <p className="text-xs text-slate-500">
            Unlock more video campaigns and higher earning limits. Paid directly from your Main Account balance.
          </p>
        </div>
        {activePurchase && (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              Active: {activePurchase.packageName} ({activePurchase.videoLimitGranted} videos)
            </span>
          </div>
        )}
      </div>

      {/* Package Cards — ONE Recommended plan, clean hierarchy, zero competing badges */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-96 rounded-2xl skeleton-shimmer border border-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {packages.map((pkg) => {
            const isCurrent = activePurchase?.packageName === pkg.name;
            const isRecommended = pkg.name === 'Premium';
            let features: string[] = [];
            try {
              features = JSON.parse(pkg.features);
            } catch {}

            return (
              <div
                key={pkg.id}
                className={`rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 relative bg-white ${
                  isRecommended
                    ? 'border-2 border-emerald-500 shadow-md ring-4 ring-emerald-500/10'
                    : 'border border-slate-200 shadow-2xs card-hover'
                }`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs whitespace-nowrap">
                    Recommended
                  </div>
                )}

                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">{pkg.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 min-h-[34px] leading-relaxed">
                        {pkg.description}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold shrink-0">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-slate-900 tabular-nums">
                      ${(pkg.priceCents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">USD</span>
                  </div>

                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Video access</span>
                    <span className="font-bold text-slate-900">{pkg.videoLimit} campaigns</span>
                  </div>

                  <ul className="space-y-2 pt-1">
                    {features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-snug">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      title="This plan is currently active on your account"
                      className="btn-secondary w-full"
                    >
                      Active Plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenPurchase(pkg)}
                      className={isRecommended ? 'btn-primary w-full' : 'btn-secondary w-full'}
                    >
                      <span>Select {pkg.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Purchase Dialog — X + Cancel always present, processing state, NEVER flashes negative/insufficient balance (#9) */}
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
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                Plan Activation
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">{selectedPackage.name} Plan</h3>
              <p className="text-xs text-slate-500">
                Unlocks access to up to {selectedPackage.videoLimit} curated video campaigns.
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
                      <div className="pl-6 text-emerald-800">
                        Remaining Main Account balance:{' '}
                        <strong className="tabular-nums">{formatUSD(successInfo.remainingCents)}</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="btn-primary w-full"
                    >
                      Done
                    </button>
                  </div>
                );
              }

              if (purchasing) {
                return (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <div className="text-xs font-bold text-slate-800">
                      Activating your {selectedPackage.name} plan…
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Recording transaction on your USD ledger. Please wait.
                    </p>
                  </div>
                );
              }

              const reqCents = selectedPackage.priceCents;
              const availCents = wallet?.USD?.availableCents ?? 0;
              const hasEnough = availCents >= reqCents;
              const shortfallCents = Math.max(0, reqCents - availCents);

              return (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Plan price</span>
                      <span className="font-bold text-slate-900 tabular-nums">{formatUSD(reqCents)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Main Account balance</span>
                      <span className="font-bold text-slate-900 tabular-nums">{formatUSD(availCents)}</span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    {hasEnough ? (
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-slate-700">Balance after activation</span>
                        <span className="text-emerald-700 tabular-nums">
                          {formatUSD(availCents - reqCents)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-slate-700">Additional USD needed</span>
                        <span className="text-amber-700 tabular-nums">
                          {formatUSD(shortfallCents)}
                        </span>
                      </div>
                    )}
                  </div>

                  {!hasEnough ? (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                        <span>
                          You need <strong className="tabular-nums">{formatUSD(shortfallCents)}</strong> more in your Main Account to activate this plan.
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
                        {navigate ? (
                          <button
                            type="button"
                            onClick={() => {
                              setModalOpen(false);
                              navigate('deposit');
                            }}
                            className="btn-primary flex-1"
                          >
                            Deposit USD
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            title="Add USD to your Main Account first"
                            className="btn-primary flex-1"
                          >
                            Insufficient Funds
                          </button>
                        )}
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
                          <span>{purchasing ? 'Activating…' : 'Confirm & Pay'}</span>
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
