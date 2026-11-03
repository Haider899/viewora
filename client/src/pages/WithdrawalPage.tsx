import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { WithdrawalRequest, Currency } from '../types/index.js';
import {
  ArrowUpRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  CreditCard,
  Lock,
} from 'lucide-react';

interface WithdrawalProps {
  navigate?: (route: string) => void;
}

export const WithdrawalPage: React.FC<WithdrawalProps> = ({ navigate }) => {
  const { user, wallet, refreshWallet } = useAuth();
  const [currency, setCurrency] = useState<Currency>('USD');
  const [payoutMethod, setPayoutMethod] = useState('CRYPTO_USDT');
  const [amountInput, setAmountInput] = useState('');
  const [accountTitle, setAccountTitle] = useState(user?.fullName || '');
  const [accountNumber, setAccountNumber] = useState('');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchWithdrawalData = async () => {
    try {
      const res = await api.getMyWithdrawals();
      if (res.success && res.data) {
        setWithdrawals(res.data);
      }
    } catch (err) {
      console.error('Failed to load withdrawals:', err);
    }
  };

  useEffect(() => {
    fetchWithdrawalData();
  }, []);

  const availableBalanceCents =
    currency === 'USD'
      ? wallet?.USD?.availableCents ?? 0
      : wallet?.PKR?.availableCents ?? 0;

  const handleCurrencyChange = (newCur: Currency) => {
    setCurrency(newCur);
    if (newCur === 'PKR') {
      setPayoutMethod('EASYPAISA');
    } else {
      setPayoutMethod('CRYPTO_USDT');
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const parsedAmount = parseFloat(amountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid monetary amount.');
      return;
    }

    const amountCents = Math.round(parsedAmount * 100);

    if (amountCents > availableBalanceCents) {
      setErrorMsg(
        `Requested amount exceeds available balance of ${(availableBalanceCents / 100).toFixed(
          2
        )} ${currency}.`
      );
      return;
    }

    if (!accountTitle.trim() || !accountNumber.trim()) {
      setErrorMsg('Please provide your complete beneficiary account title and payout number/address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createWithdrawalRequest({
        amountCents,
        currency,
        payoutMethod,
        accountTitle: accountTitle.trim(),
        accountNumber: accountNumber.trim(),
      });

      if (res.success) {
        setSuccessMsg(
          'Withdrawal request created! Funds have been securely reserved on hold pending payout settlement.'
        );
        setAmountInput('');
        setAccountNumber('');
        await refreshWallet();
        await fetchWithdrawalData();
      } else {
        setErrorMsg(res.error?.message || 'Withdrawal request failed.');
      }
    } catch (err: any) {
      setErrorMsg('Network error submitting withdrawal request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Request Payout & Withdrawal</h2>
          <p className="text-xs text-slate-500">
            Submit a withdrawal request. Funds are placed on a verified ledger hold to prevent double-spending until external settlement.
          </p>
        </div>
        {navigate && (
          <button
            onClick={() => navigate('wallet')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Wallet
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Request Form */}
        <div className="lg:col-span-6 space-y-6">
          <form
            onSubmit={handleWithdrawalSubmit}
            className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-5"
          >
            {/* Currency Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Select Withdrawal Currency
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleCurrencyChange('USD')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between ${
                    currency === 'USD'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>USD Wallet</span>
                  <span className="font-mono font-extrabold">${((wallet?.USD?.availableCents ?? 0) / 100).toFixed(2)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCurrencyChange('PKR')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between ${
                    currency === 'PKR'
                      ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>PKR Wallet</span>
                  <span className="font-mono font-extrabold">Rs {((wallet?.PKR?.availableCents ?? 0) / 100).toFixed(0)}</span>
                </button>
              </div>
            </div>

            {/* Payout Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payout Channel
              </label>
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-semibold"
              >
                {currency === 'PKR' ? (
                  <>
                    <option value="EASYPAISA">EasyPaisa Mobile Account</option>
                    <option value="JAZZCASH">JazzCash Wallet</option>
                    <option value="BANK_TRANSFER">Direct Bank IBFT Wire</option>
                  </>
                ) : (
                  <>
                    <option value="CRYPTO_USDT">USDT (TRC-20 Network)</option>
                  </>
                )}
              </select>
            </div>

            {/* Amount */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Withdrawal Amount ({currency})
                </label>
                <button
                  type="button"
                  onClick={() => setAmountInput(((availableBalanceCents) / 100).toString())}
                  className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold"
                >
                  Max Available
                </button>
              </div>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                required
              />
            </div>

            {/* Beneficiary Details */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Beneficiary Account Title
              </label>
              <input
                type="text"
                placeholder="Exact legal name on receiving account"
                value={accountTitle}
                onChange={(e) => setAccountTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Account Number / IBAN / USDT TRC-20 Address
              </label>
              <input
                type="text"
                placeholder="Receiving mobile number or wallet address"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>

            {/* Hold Disclaimer Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                Ledger Hold Invariant
              </div>
              <p>
                The requested amount will immediately transition from Available to Reserved. If rejected, the hold is safely released back to your available balance.
              </p>
            </div>

            {/* Alerts */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              <ArrowUpRight className="w-4 h-4" />
              {submitting ? 'Reserving Ledger Balance...' : 'Confirm Withdrawal Request'}
            </button>
          </form>
        </div>

        {/* Right: Withdrawal Status & Queue */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Your Payout Requests & Lifecycle
            </h3>

            {withdrawals.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No withdrawal requests on record yet.
              </p>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-extrabold text-slate-900 text-sm">
                        {(w.amountCents / 100).toFixed(2)} {w.currency}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          w.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : w.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : w.status === 'APPROVED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {w.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Method: {w.payoutMethod}</span>
                      <span>{new Date(w.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="text-[10px] font-mono text-slate-600 truncate">
                      To: {w.accountTitle} ({w.accountNumber})
                    </div>

                    {w.payoutRef && (
                      <div className="pt-2 border-t border-slate-200 text-[10px] text-emerald-700 font-mono font-semibold">
                        Confirmed Payout Ref: {w.payoutRef}
                      </div>
                    )}
                    {w.rejectionReason && (
                      <div className="pt-2 border-t border-slate-200 text-[10px] text-rose-600">
                        Reason: {w.rejectionReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
