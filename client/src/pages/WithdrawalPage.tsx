import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { WithdrawalRequest } from '../types/index.js';
import { useToast } from '../components/ToastProvider.js';
import {
  formatDateTime,
  formatPayoutMethod,
  formatUSD,
  shortenCode,
} from '../utils/formatters.js';
import {
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';

interface WithdrawalProps {
  navigate?: (route: string) => void;
}

type SourceWalletKey =
  | 'USER_AVAILABLE'
  | 'USER_VIDEO_REWARDS'
  | 'USER_REFERRAL'
  | 'USER_OTHER_REWARDS';

const MIN_WITHDRAWAL_USD = 10;

export const WithdrawalPage: React.FC<WithdrawalProps> = () => {
  const { user, wallet, refreshWallet } = useAuth();
  const { showToast } = useToast();

  const [sourceWallet, setSourceWallet] = useState<SourceWalletKey>('USER_AVAILABLE');
  const [payoutMethod, setPayoutMethod] = useState('CRYPTO_USDT');
  const [amountInput, setAmountInput] = useState('');
  const [accountTitle, setAccountTitle] = useState(user?.fullName || '');
  const [accountNumber, setAccountNumber] = useState('');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ amount?: string; title?: string; number?: string }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchWithdrawalData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.getMyWithdrawals();
      if (res.success && res.data) {
        setWithdrawals(res.data);
      }
      if (isManual) {
        await refreshWallet();
        showToast('Withdrawal status refreshed.', 'success');
      }
    } catch (err) {
      console.error('Failed to load withdrawals:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshWallet();
    fetchWithdrawalData(false);
  }, []);

  const walletBalances: Record<SourceWalletKey, { label: string; cents: number }> = {
    USER_AVAILABLE: { label: 'Main Account', cents: wallet?.USD?.availableCents ?? 0 },
    USER_VIDEO_REWARDS: { label: 'Video Rewards', cents: wallet?.USD?.videoRewardsCents ?? 0 },
    USER_REFERRAL: { label: 'Referral Wallet', cents: wallet?.USD?.referralCents ?? 0 },
    USER_OTHER_REWARDS: { label: 'Bonus Rewards', cents: wallet?.USD?.otherRewardsCents ?? 0 },
  };

  const availableBalanceCents = walletBalances[sourceWallet].cents;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'COMPLETED':
        return { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'REJECTED':
      case 'FAILED':
      case 'CANCELLED':
        return { label: status === 'CANCELLED' ? 'Cancelled' : 'Rejected', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'APPROVED':
      case 'PROCESSING':
      case 'UNDER_REVIEW':
        return { label: 'In Review', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
  };

  const handleCopyAddress = (id: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedId(id);
    showToast('Payout address copied.', 'success');
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const errs: { amount?: string; title?: string; number?: string } = {};
    const parsedAmount = parseFloat(amountInput);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      errs.amount = 'Enter a valid USD amount.';
    } else if (parsedAmount < MIN_WITHDRAWAL_USD) {
      errs.amount = `Minimum withdrawal is $${MIN_WITHDRAWAL_USD.toFixed(2)} USD.`;
    } else if (Math.round(parsedAmount * 100) > availableBalanceCents) {
      errs.amount = `Exceeds available ${walletBalances[sourceWallet].label} balance (${formatUSD(
        availableBalanceCents
      )}).`;
    }

    if (!accountTitle.trim()) {
      errs.title = 'Enter the recipient account holder name.';
    }
    if (!accountNumber.trim()) {
      errs.number =
        payoutMethod === 'CRYPTO_USDT'
          ? 'Enter your USDT TRC-20 wallet address.'
          : 'Enter your bank account / IBAN and SWIFT details.';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setFieldErrors({});
    const amountCents = Math.round(parsedAmount * 100);
    setSubmitting(true);
    try {
      const res = await api.createWithdrawalRequest({
        amountCents,
        currency: 'USD',
        payoutMethod,
        accountTitle: accountTitle.trim(),
        accountNumber: accountNumber.trim(),
        sourceWallet,
      });

      if (res.success) {
        setSuccessMsg(
          `Withdrawal request for ${formatUSD(amountCents)} submitted. Your funds are reserved while our team completes the transfer.`
        );
        showToast('Withdrawal request submitted.', 'success');
        setAmountInput('');
        setAccountNumber('');
        await refreshWallet();
        await fetchWithdrawalData(false);
      } else {
        setErrorMsg(res.error?.message || 'Unable to submit withdrawal request.');
      }
    } catch {
      setErrorMsg('Network error submitting withdrawal request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Request Form (consistent left-form / right-history layout) */}
      <div className="lg:col-span-6">
        <form onSubmit={handleWithdrawalSubmit} noValidate className="card-white p-6 space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Request a USD Payout</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Minimum withdrawal: <strong className="text-slate-800">${MIN_WITHDRAWAL_USD}.00 USD</strong> · Available in selected wallet:{' '}
              <strong className="text-emerald-700 tabular-nums">{formatUSD(availableBalanceCents)}</strong>
            </p>
          </div>

          {/* Source Wallet Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Source Wallet <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(['USER_AVAILABLE', 'USER_VIDEO_REWARDS', 'USER_REFERRAL'] as SourceWalletKey[]).map(
                (key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSourceWallet(key);
                      setFieldErrors((f) => ({ ...f, amount: undefined }));
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      sourceWallet === key
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-[11px] font-bold">{walletBalances[key].label}</div>
                    <div className="font-extrabold text-sm mt-0.5 tabular-nums text-slate-900">
                      {formatUSD(walletBalances[key].cents)}
                    </div>
                  </button>
                )
              )}
            </div>
            {(wallet?.USD?.otherRewardsCents ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => setSourceWallet('USER_OTHER_REWARDS')}
                className={`mt-2 w-full p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer ${
                  sourceWallet === 'USER_OTHER_REWARDS'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <span>Bonus Rewards</span>
                <span className="tabular-nums">{formatUSD(wallet?.USD?.otherRewardsCents ?? 0)}</span>
              </button>
            )}
          </div>

          {/* Payout Method */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Payout Method <span className="text-rose-600">*</span>
            </label>
            <select
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value)}
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-[10px] px-3.5 text-xs font-semibold text-slate-900 focus:border-emerald-500"
            >
              <option value="CRYPTO_USDT">Crypto — USDT TRC-20</option>
              <option value="USD_BANK_WIRE">USD Bank Wire</option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Withdrawal Amount (USD) <span className="text-rose-600">*</span>
              </label>
              <button
                type="button"
                disabled={availableBalanceCents <= 0}
                onClick={() => {
                  setAmountInput((availableBalanceCents / 100).toFixed(2));
                  setFieldErrors((f) => ({ ...f, amount: undefined }));
                }}
                className="text-xs font-bold text-emerald-700 hover:underline disabled:opacity-40 cursor-pointer tabular-nums"
              >
                Use max ({formatUSD(availableBalanceCents)})
              </button>
            </div>
            <input
              type="number"
              step="0.01"
              min={MIN_WITHDRAWAL_USD}
              placeholder={`Minimum ${MIN_WITHDRAWAL_USD}.00`}
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                setFieldErrors((f) => ({ ...f, amount: undefined }));
              }}
              className={`w-full h-11 rounded-[10px] px-3.5 text-sm font-bold tabular-nums bg-slate-50 border text-slate-900 ${
                fieldErrors.amount ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-emerald-500'
              }`}
            />
            {fieldErrors.amount && (
              <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {fieldErrors.amount}
              </p>
            )}
          </div>

          {/* Beneficiary Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Recipient Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              placeholder="Full name on receiving account"
              value={accountTitle}
              onChange={(e) => {
                setAccountTitle(e.target.value);
                setFieldErrors((f) => ({ ...f, title: undefined }));
              }}
              className={`w-full h-10 rounded-[10px] px-3.5 text-xs bg-slate-50 border text-slate-900 ${
                fieldErrors.title ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-emerald-500'
              }`}
            />
            {fieldErrors.title && (
              <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {fieldErrors.title}
              </p>
            )}
          </div>

          {/* Destination Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {payoutMethod === 'CRYPTO_USDT'
                ? 'USDT TRC-20 Wallet Address'
                : 'Bank Account / IBAN & SWIFT'}{' '}
              <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              placeholder={
                payoutMethod === 'CRYPTO_USDT'
                  ? 'Paste your TRC-20 wallet address'
                  : 'Enter your IBAN / account number and SWIFT code'
              }
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value);
                setFieldErrors((f) => ({ ...f, number: undefined }));
              }}
              className={`w-full h-10 rounded-[10px] px-3.5 text-xs font-mono bg-slate-50 border text-slate-900 ${
                fieldErrors.number ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-emerald-500'
              }`}
            />
            {fieldErrors.number && (
              <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {fieldErrors.number}
              </p>
            )}
          </div>

          {/* Plain-English Hold Explanation (no jargon!) */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5 leading-relaxed">
            <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <span>
              Requested funds are temporarily held while our team reviews and sends your payout. If a request is declined, the full amount returns to your wallet automatically.
            </span>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || availableBalanceCents < MIN_WITHDRAWAL_USD * 100}
            title={
              availableBalanceCents < MIN_WITHDRAWAL_USD * 100
                ? `At least $${MIN_WITHDRAWAL_USD}.00 is required to withdraw from this wallet`
                : 'Submit withdrawal request'
            }
            className="btn-primary w-full !h-11"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>{submitting ? 'Submitting Request…' : 'Submit Withdrawal Request'}</span>
          </button>
        </form>
      </div>

      {/* Right: Payout History */}
      <div className="lg:col-span-6">
        <div className="card-white p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Your Payout History
            </h3>
            <button
              type="button"
              onClick={() => fetchWithdrawalData(true)}
              disabled={refreshing}
              className="btn-secondary !h-8 !px-3"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-24 rounded-xl skeleton-shimmer" />
              <div className="h-24 rounded-xl skeleton-shimmer" />
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <div className="text-sm font-bold text-slate-900">No withdrawal requests yet</div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Once your balance reaches ${MIN_WITHDRAWAL_USD}.00 USD, you can request a payout to USDT TRC-20 or USD Bank Wire.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((w) => {
                const badge = getStatusBadge(w.status);
                return (
                  <div
                    key={w.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-extrabold text-slate-900 text-base tabular-nums">
                        {formatUSD(w.amountCents)}
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600">
                      <span className="font-semibold">{formatPayoutMethod(w.payoutMethod)}</span>
                      <span className="text-slate-400">{formatDateTime(w.createdAt)}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/80">
                      <div className="text-[11px] text-slate-600 truncate">
                        {w.accountTitle} ·{' '}
                        <span className="font-mono text-slate-800">{shortenCode(w.accountNumber, 8, 6)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyAddress(w.id, w.accountNumber)}
                        className="text-[11px] font-bold text-slate-500 hover:text-emerald-700 flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedId === w.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === w.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {w.payoutRef && (
                      <div className="pt-1.5 border-t border-slate-200/80 text-[11px] text-emerald-700 font-semibold">
                        Payout Reference: <span className="font-mono">{w.payoutRef}</span>
                      </div>
                    )}
                    {w.rejectionReason && (
                      <div className="pt-1.5 border-t border-slate-200/80 text-[11px] text-rose-700">
                        Reason: {w.rejectionReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
