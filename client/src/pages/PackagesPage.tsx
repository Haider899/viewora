import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Package, PackagePurchase } from '../types/index.js';
import {
  Check,
  Zap,
  Shield,
  Layers,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface PackagesProps {
  navigate?: (route: string) => void;
}

export const PackagesPage: React.FC<PackagesProps> = ({ navigate }) => {
  const { user, wallet, refreshWallet } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [activePurchase, setActivePurchase] = useState<PackagePurchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currencyView, setCurrencyView] = useState<'USD' | 'PKR'>('USD');
  const [payCurrency, setPayCurrency] = useState<'USD' | 'PKR'>('USD');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const exchangeRate = 280; // Official platform rate: 1 USD = 280 PKR

  const fetchPackagesData = async () => {
    setLoading(true);
    try {
      const [pkgRes, activeRes] = await Promise.all([
        api.getPackages(),
        user ? api.getMyActivePackage() : Promise.resolve({ success: false, data: null }),
      ]);

      if (pkgRes.success && pkgRes.data) {
        setPackages(pkgRes.data);
      }
      if (activeRes.success && activeRes.data) {
        setActivePurchase(activeRes.data);
      }
    } catch (err) {
      console.error('Failed to load packages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackagesData();
  }, [user]);

  // If user has deposited PKR or has PKR balance, default display to PKR
  useEffect(() => {
    if (wallet) {
      if ((wallet.PKR?.availableCents ?? 0) > 0 && (wallet.USD?.availableCents ?? 0) === 0) {
        setCurrencyView('PKR');
        setPayCurrency('PKR');
      }
    }
  }, [wallet]);

  const handleOpenPurchase = (pkg: Package) => {
    if (!user) {
      if (navigate) navigate('login');
      return;
    }
    setSelectedPackage(pkg);

    // Auto-select paying currency based on sufficient funds
    const pkrNeededCents = Math.round((pkg.priceCents * exchangeRate) / 100) * 100;
    if ((wallet?.PKR?.availableCents ?? 0) >= pkrNeededCents) {
      setPayCurrency('PKR');
    } else if ((wallet?.USD?.availableCents ?? 0) >= pkg.priceCents) {
      setPayCurrency('USD');
    } else if ((wallet?.PKR?.availableCents ?? 0) > 0) {
      setPayCurrency('PKR');
    } else {
      setPayCurrency(currencyView);
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setModalOpen(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedPackage) return;
    setPurchasing(true);
    setErrorMsg(null);
    try {
      const res = await api.purchasePackage(selectedPackage.id, payCurrency);
      if (res.success && res.data) {
        setSuccessMsg(`Congratulations! You have unlocked the ${selectedPackage.name} tier.`);
        await refreshWallet();
        await fetchPackagesData();
        setTimeout(() => {
          setModalOpen(false);
        }, 1800);
      } else {
        setErrorMsg(res.error?.message || 'Failed to complete package purchase.');
      }
    } catch (err: any) {
      setErrorMsg('Error executing transaction.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">
          Transparent Tiers
        </span>
        <h2 className="text-3xl font-extrabold text-slate-900">
          Access Packages & Video Limits
        </h2>
        <p className="text-slate-600 text-xs leading-relaxed">
          Four distinct curriculum tiers designed for structured advancement. Package terms and access rights are preserved on an immutable historical ledger.
        </p>

        {activePurchase && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Active Subscribed Tier: {activePurchase.packageName} ({activePurchase.videoLimitGranted} Videos Access)
          </div>
        )}

        {/* Currency Display Switcher */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <span className="text-xs font-semibold text-slate-500">Show Prices In:</span>
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setCurrencyView('PKR')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                currencyView === 'PKR'
                  ? 'bg-white text-emerald-700 shadow-2xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              PKR (Rs.)
            </button>
            <button
              type="button"
              onClick={() => setCurrencyView('USD')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                currencyView === 'USD'
                  ? 'bg-white text-emerald-700 shadow-2xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              USD ($)
            </button>
          </div>
          <span className="text-[10px] text-slate-400 font-mono ml-1">
            (1 USD = {exchangeRate} PKR)
          </span>
        </div>
      </div>

      {/* Package Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {packages.map((pkg) => {
          const isCurrent = activePurchase?.packageName === pkg.name;
          let features: string[] = [];
          try {
            features = JSON.parse(pkg.features);
          } catch {}

          const isVip = pkg.name === 'VIP';
          const isPremium = pkg.name === 'Premium';
          const pkrEquivalent = (pkg.priceCents / 100) * exchangeRate;

          return (
            <div
              key={pkg.id}
              className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-200 relative ${
                isVip
                  ? 'bg-white border-2 border-emerald-500 shadow-md ring-4 ring-emerald-500/10'
                  : 'bg-white border border-slate-200/90 shadow-xs card-hover'
              }`}
            >
              {pkg.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                  {pkg.badge}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{pkg.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{pkg.description}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-1.5">
                    {currencyView === 'PKR' ? (
                      <>
                        <span className="text-3xl font-extrabold text-slate-900">
                          Rs. {pkrEquivalent.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">PKR</span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-extrabold text-slate-900">
                          ${(pkg.priceCents / 100).toFixed(0)}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">USD</span>
                      </>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    {currencyView === 'PKR'
                      ? `Equivalent to $${(pkg.priceCents / 100).toFixed(0)} USD`
                      : `Equivalent to Rs. ${pkrEquivalent.toLocaleString()} PKR`}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Video Limit:</span>
                  <span className="font-bold text-emerald-700">{pkg.videoLimit} Masterclasses</span>
                </div>

                {/* Features List */}
                <div className="space-y-2.5 pt-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Included Benefits
                  </div>
                  <ul className="space-y-2">
                    {features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-8">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  >
                    Active Tier
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenPurchase(pkg)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                      isVip || isPremium
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    Select {pkg.name} Tier
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Purchase Confirmation Modal */}
      {modalOpen && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-8 space-y-6 shadow-2xl relative">
            <div className="space-y-1 text-center">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                Confirm Tier Activation
              </span>
              <h3 className="text-2xl font-bold text-slate-900">{selectedPackage.name} Package</h3>
              <p className="text-xs text-slate-500">
                Unlocks access to up to {selectedPackage.videoLimit} specialized masterclasses.
              </p>
            </div>

            {/* Choose Payment Wallet Currency */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Select Payment Wallet:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPayCurrency('PKR')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    payCurrency === 'PKR'
                      ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900">PKR Wallet</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Avail: Rs. {(((wallet?.PKR?.availableCents ?? 0) / 100)).toLocaleString()}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPayCurrency('USD')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    payCurrency === 'USD'
                      ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900">USD Wallet</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Avail: ${(((wallet?.USD?.availableCents ?? 0) / 100)).toFixed(2)}
                  </div>
                </button>
              </div>
            </div>

            {/* Financial Ledger Summary */}
            {(() => {
              const isPkr = payCurrency === 'PKR';
              const reqCents = isPkr
                ? Math.round((selectedPackage.priceCents * exchangeRate) / 100) * 100
                : selectedPackage.priceCents;
              const availCents = isPkr
                ? (wallet?.PKR?.availableCents ?? 0)
                : (wallet?.USD?.availableCents ?? 0);
              const hasEnough = availCents >= reqCents;

              return (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Package Cost:</span>
                      <span className="font-bold text-slate-900">
                        {isPkr
                          ? `Rs. ${(reqCents / 100).toLocaleString()} PKR`
                          : `$${(reqCents / 100).toFixed(2)} USD`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Available Balance:</span>
                      <span className="font-bold text-emerald-700">
                        {isPkr
                          ? `Rs. ${(availCents / 100).toLocaleString()} PKR`
                          : `$${(availCents / 100).toFixed(2)} USD`}
                      </span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-slate-700">Remaining After Purchase:</span>
                      <span className={hasEnough ? 'text-slate-900' : 'text-rose-600'}>
                        {isPkr
                          ? `Rs. ${((availCents - reqCents) / 100).toLocaleString()} PKR`
                          : `$${((availCents - reqCents) / 100).toFixed(2)} USD`}
                      </span>
                    </div>
                  </div>

                  {!hasEnough ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>
                          Insufficient available {payCurrency} balance. Please deposit funds or switch wallet.
                        </span>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setModalOpen(false)}
                          className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                          Cancel
                        </button>
                        {navigate && (
                          <button
                            onClick={() => {
                              setModalOpen(false);
                              navigate('deposit');
                            }}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500"
                          >
                            Deposit {payCurrency}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {errorMsg && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                          <span>{errorMsg}</span>
                        </div>
                      )}
                      {successMsg && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                          <span>{successMsg}</span>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          onClick={() => setModalOpen(false)}
                          disabled={purchasing}
                          className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleConfirmPurchase}
                          disabled={purchasing}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          {purchasing ? 'Executing Ledger Debit...' : `Confirm & Pay with ${payCurrency}`}
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

