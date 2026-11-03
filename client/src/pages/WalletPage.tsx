import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { LedgerEntryItem } from '../types/index.js';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Clock,
  Layers,
  ShieldCheck,
  CreditCard,
  History,
  CheckCircle2,
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

  const formatAmount = (cents: number, currency: string) => {
    if (currency === 'PKR') {
      return `Rs ${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
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
      {/* Balance Cards: USD & PKR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* USD Wallet */}
        <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs card-hover space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-extrabold text-base">
                $
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">United States Dollar (USD)</h3>
                <span className="text-[11px] text-slate-400 font-medium">Global Clearing Account</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-slate-500 font-medium">Available Balance</div>
            <div className="text-4xl font-extrabold text-slate-900">
              ${((wallet?.USD?.availableCents ?? 0) / 100).toFixed(2)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div>
              <span className="text-slate-400">Reserved (Hold):</span>
              <div className="font-bold text-amber-600 mt-0.5">
                ${((wallet?.USD?.reservedCents ?? 0) / 100).toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Total Account Value:</span>
              <div className="font-bold text-slate-700 mt-0.5">
                ${((wallet?.USD?.totalCents ?? 0) / 100).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* PKR Wallet */}
        <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs card-hover space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 font-extrabold text-xs">
                PKR
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Pakistani Rupee (PKR)</h3>
                <span className="text-[11px] text-slate-400 font-medium">Domestic Clearing Account</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              Active
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-slate-500 font-medium">Available Balance</div>
            <div className="text-4xl font-extrabold text-slate-900">
              Rs {((wallet?.PKR?.availableCents ?? 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div>
              <span className="text-slate-400">Reserved (Hold):</span>
              <div className="font-bold text-amber-600 mt-0.5">
                Rs {((wallet?.PKR?.reservedCents ?? 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Total Account Value:</span>
              <div className="font-bold text-slate-700 mt-0.5">
                Rs {((wallet?.PKR?.totalCents ?? 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Ledger Table */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xs overflow-hidden space-y-4">
        <div className="p-6 pb-2 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Double-Entry Financial Journal</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Total Entries: {total}</span>
            <button
              onClick={() => {
                refreshWallet();
                fetchTransactions(page);
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
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
                  <th className="py-3 px-6">Account</th>
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
                        <span className="text-[11px] font-mono text-slate-500">
                          {item.account.accountType} ({item.account.currency})
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right font-mono font-bold">
                        <span
                          className={isCredit ? 'text-emerald-600' : 'text-slate-800'}
                        >
                          {isCredit ? '+' : '-'}{formatAmount(item.amountCents, item.account.currency)}
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
