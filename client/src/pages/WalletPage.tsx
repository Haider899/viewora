import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { LedgerEntryItem } from '../types/index.js';
import {
  Wallet,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Clock,
  Layers,
  ShieldCheck,
  CreditCard,
  History,
  CheckCircle2,
  Share2,
  DollarSign,
  AlertCircle,
  X,
} from 'lucide-react';

interface WalletProps {
  navigate?: (route: string) => void;
}

export const WalletPage: React.FC<WalletProps> = ({ navigate }) => {
  const { wallet, refreshWallet } = useAuth();
  const [entries, setEntries] = useState<LedgerEntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Transfer modal state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferAmountInput, setTransferAmountInput] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);

  const fetchTransactions = async (pageNumber = 1) => {
    setLoading(true);
    try {
      const res = await api.getTransactions(pageNumber, 15);
      if (res.success && res.data) {
        setEntries(res.data.entries);
        setTotal(res.data.total);
        setPage(res.data.page);
      }
    } catch (err) {
      console.error('Failed to load transaction history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshWallet();
    fetchTransactions(1);
  }, []);

  const formatUSD = (cents: number) => {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const referralAvailableCents = wallet?.USD?.referralCents ?? 0;
  const mainAvailableCents = wallet?.USD?.availableCents ?? 0;
  const mainReservedCents = wallet?.USD?.reservedCents ?? 0;

  const handleMaxTransfer = () => {
    setTransferAmountInput((referralAvailableCents / 100).toFixed(2));
    setTransferError(null);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);
    setTransferSuccess(null);

    const parsedUSD = parseFloat(transferAmountInput);
    if (isNaN(parsedUSD) || parsedUSD <= 0) {
      setTransferError('Please enter a valid transfer amount greater than $0.');
      return;
    }

    const amountCents = Math.round(parsedUSD * 100);
    if (amountCents > referralAvailableCents) {
      setTransferError(`Cannot transfer more than your available referral balance (${formatUSD(referralAvailableCents)}).`);
      return;
    }

    setTransferring(true);
    try {
      const res = await api.transferReferralToMainBalance(amountCents);
      if (res.success) {
        setTransferSuccess(`Successfully transferred ${formatUSD(amountCents)} into your Main Account Credits!`);
        await refreshWallet();
        await fetchTransactions(1);
        setTimeout(() => {
          setTransferModalOpen(false);
          setTransferSuccess(null);
          setTransferAmountInput('');
        }, 1800);
      } else {
        setTransferError(res.error?.message || 'Transfer failed.');
      }
    } catch (err: any) {
      setTransferError(err.message || 'Error executing transfer.');
    } finally {
      setTransferring(false);
    }
  };

  const getBadgeForTxType = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PACKAGE_PURCHASE':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'REWARD_CREDIT':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'REFERRAL_COMMISSION':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'REFERRAL_CONVERT':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'MILESTONE_REWARD':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'WITHDRAWAL_HOLD':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'WITHDRAWAL_SETTLE':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'WITHDRAWAL_RELEASE':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-8">
      {/* Platform Currency Notice */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-extrabold text-sm">
            $
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Standard Currency: USD Only</h4>
            <p className="text-[11px] text-slate-500">
              In accordance with platform guidelines, all deposits, rewards, and settlements are conducted in USD.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            refreshWallet();
            fetchTransactions(page);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Dual Wallet Cards: Main Account Credits vs Separate Referral Wallet */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Wallet 1: Main Account Credits */}
        <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <CreditCard className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Main Account Credits</h3>
                  <span className="text-[11px] text-slate-400 font-medium">Video Access & Clearing Wallet</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Primary
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-500 font-medium">Available Account Credits</div>
              <div className="text-4xl font-black text-slate-900 tracking-tight">
                {formatUSD(mainAvailableCents)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400">Reserved (Withdrawal Hold):</span>
                <div className="font-bold text-amber-600 mt-0.5">
                  {formatUSD(mainReservedCents)}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Total Credits:</span>
                <div className="font-bold text-slate-800 mt-0.5">
                  {formatUSD(mainAvailableCents + mainReservedCents)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => navigate?.('deposit')}
              className="py-2.5 px-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center justify-center gap-2 shadow-2xs transition-all"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Deposit USD</span>
            </button>
            <button
              onClick={() => navigate?.('withdrawal')}
              className="py-2.5 px-4 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white text-xs flex items-center justify-center gap-2 shadow-2xs transition-all"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Withdraw USD</span>
            </button>
          </div>
        </div>

        {/* Wallet 2: Separate Referral Wallet (Section 9) */}
        <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Share2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Separate Referral Wallet</h3>
                  <span className="text-[11px] text-slate-400 font-medium">Affiliate Commissions & Milestones</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Isolated Ledger
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-500 font-medium">Available Referral Balance</div>
              <div className="text-4xl font-black text-indigo-950 tracking-tight">
                {formatUSD(referralAvailableCents)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400">Ledger Classification:</span>
                <div className="font-bold text-indigo-700 mt-0.5">
                  USER_REFERRAL
                </div>
              </div>
              <div>
                <span className="text-slate-400">Auto-Audited:</span>
                <div className="font-bold text-slate-800 mt-0.5">
                  Double-Entry
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                setTransferError(null);
                setTransferSuccess(null);
                setTransferAmountInput('');
                setTransferModalOpen(true);
              }}
              disabled={referralAvailableCents <= 0}
              className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                referralAvailableCents > 0
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Transfer to Main</span>
            </button>
            <button
              onClick={() => navigate?.('withdrawal')}
              disabled={referralAvailableCents <= 0}
              className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                referralAvailableCents > 0
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  : 'bg-slate-50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transfer to Account Credits Modal (Section 9 - Option B) */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xl relative">
            <button
              onClick={() => setTransferModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-2">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Transfer Referral to Account Credits</h3>
              <p className="text-xs text-slate-500">
                Move funds from your separate Referral Wallet into your Main Account Credits to unlock videos or curriculum tiers.
              </p>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Amount to Transfer (USD)</label>
                  <button
                    type="button"
                    onClick={handleMaxTransfer}
                    className="text-[11px] font-bold text-indigo-600 hover:underline"
                  >
                    Max ({formatUSD(referralAvailableCents)})
                  </button>
                </div>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={(referralAvailableCents / 100).toFixed(2)}
                    placeholder="0.00"
                    value={transferAmountInput}
                    onChange={(e) => setTransferAmountInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              {parseFloat(transferAmountInput) > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Referral Wallet After:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {formatUSD(Math.max(0, referralAvailableCents - Math.round(parseFloat(transferAmountInput) * 100)))}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Main Account Credits After:</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {formatUSD(mainAvailableCents + Math.round(parseFloat(transferAmountInput) * 100))}
                    </span>
                  </div>
                </div>
              )}

              {transferError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{transferError}</span>
                </div>
              )}

              {transferSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{transferSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={transferring || parseFloat(transferAmountInput) <= 0}
                className="w-full py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 text-white disabled:text-slate-400 transition-all text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                {transferring ? 'Executing Ledger Transfer...' : 'Confirm Transfer to Main Credits'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Transaction History Ledger Table */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xs overflow-hidden space-y-4">
        <div className="p-6 pb-2 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Double-Entry Financial Journal</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Total Entries: {total}</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading ledger entries...</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No financial transactions recorded yet. Make a deposit or claim a video completion reward to see ledger entries.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">Reference / Time</th>
                  <th className="py-3 px-6">Transaction Type</th>
                  <th className="py-3 px-6">Description</th>
                  <th className="py-3 px-6">Account Type</th>
                  <th className="py-3 px-6 text-right">Entry Type / Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {entries.map((item) => {
                  const isCredit = item.entryType === 'CREDIT';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 space-y-0.5">
                        <div className="font-mono text-slate-900 text-[11px] font-bold">
                          {item.transaction.reference}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(item.createdAt).toLocaleString()}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getBadgeForTxType(
                            item.transaction.transactionType
                          )}`}
                        >
                          {item.transaction.transactionType}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-slate-600 max-w-xs truncate font-medium">
                        {item.transaction.description}
                      </td>

                      <td className="py-4 px-6">
                        <span className="text-[11px] font-mono text-slate-500 font-semibold">
                          {item.account.accountType}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right font-mono font-bold">
                        <span
                          className={isCredit ? 'text-emerald-600' : 'text-slate-800'}
                        >
                          {isCredit ? '+' : '-'}{formatUSD(item.amountCents)}
                        </span>
                        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-sans font-medium">
                          {item.entryType}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
