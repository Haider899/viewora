import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { LedgerEntryItem } from '../types/index.js';
import {
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  CreditCard,
  History,
  CheckCircle2,
  Share2,
  DollarSign,
  AlertCircle,
  X,
  PlaySquare,
  Gift,
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

  // Unified Transfer Modal (supports Referral Wallet or Video Rewards Wallet -> Main Account Credits)
  const [transferSource, setTransferSource] = useState<'REFERRAL' | 'VIDEO_REWARDS' | null>(null);
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

  const formatUSD = (cents: number) =>
    `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const mainAvailableCents = wallet?.USD?.availableCents ?? 0;
  const mainReservedCents = wallet?.USD?.reservedCents ?? 0;
  const videoRewardsCents = wallet?.USD?.videoRewardsCents ?? 0;
  const referralAvailableCents = wallet?.USD?.referralCents ?? 0;
  const otherRewardsCents = wallet?.USD?.otherRewardsCents ?? 0;

  const activeSourceCents =
    transferSource === 'VIDEO_REWARDS' ? videoRewardsCents : referralAvailableCents;

  const openTransferModal = (source: 'REFERRAL' | 'VIDEO_REWARDS') => {
    setTransferSource(source);
    setTransferAmountInput('');
    setTransferError(null);
    setTransferSuccess(null);
  };

  const handleMaxTransfer = () => {
    setTransferAmountInput((activeSourceCents / 100).toFixed(2));
    setTransferError(null);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferSource) return;
    setTransferError(null);
    setTransferSuccess(null);

    const parsedUSD = parseFloat(transferAmountInput);
    if (isNaN(parsedUSD) || parsedUSD <= 0) {
      setTransferError('Please enter a valid transfer amount greater than $0.');
      return;
    }

    const amountCents = Math.round(parsedUSD * 100);
    if (amountCents > activeSourceCents) {
      setTransferError(`Cannot transfer more than your available balance (${formatUSD(activeSourceCents)}).`);
      return;
    }

    setTransferring(true);
    try {
      const res =
        transferSource === 'VIDEO_REWARDS'
          ? await api.transferVideoRewardsToMain(amountCents)
          : await api.transferReferralToMainBalance(amountCents);

      if (res.success) {
        setTransferSuccess(
          `Successfully transferred ${formatUSD(amountCents)} into your Main Account Credits!`
        );
        await refreshWallet();
        await fetchTransactions(1);
        setTimeout(() => {
          setTransferSource(null);
          setTransferSuccess(null);
          setTransferAmountInput('');
        }, 1600);
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
      case 'VIDEO_REWARD_CONVERT':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'REFERRAL_COMMISSION':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'REFERRAL_CONVERT':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'MILESTONE_REWARD':
      case 'DAILY_BONUS':
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-extrabold text-sm shrink-0">
            $
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">U-Ads USD Wallets (USD Only)</h4>
            <p className="text-[11px] text-slate-500">
              All deposits, video rewards, referral commissions, and withdrawals operate strictly in USD on our double-entry ledger.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            refreshWallet();
            fetchTransactions(page);
          }}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* 3 Primary USD Wallet Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wallet 1: Main Account Credits */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <CreditCard className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Main Account Credits</h3>
                  <span className="text-[11px] text-slate-400 font-medium">Deposits & Package Balance</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Primary
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="text-[11px] text-slate-500 font-medium">Available Balance</div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {formatUSD(mainAvailableCents)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">Reserved (Hold):</span>
                <div className="font-bold text-amber-600 mt-0.5">{formatUSD(mainReservedCents)}</div>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Total Main:</span>
                <div className="font-bold text-slate-800 mt-0.5">
                  {formatUSD(mainAvailableCents + mainReservedCents)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={() => navigate?.('deposit')}
              className="py-2.5 px-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Deposit</span>
            </button>
            <button
              onClick={() => navigate?.('withdrawal')}
              className="py-2.5 px-3 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>

        {/* Wallet 2: Video Rewards Wallet */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                  <PlaySquare className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Video Rewards Wallet</h3>
                  <span className="text-[11px] text-slate-400 font-medium">Verified Video Completions</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                Rewards
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="text-[11px] text-slate-500 font-medium">Available Video Rewards</div>
              <div className="text-3xl font-black text-teal-900 tracking-tight">
                {formatUSD(videoRewardsCents)}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
              Automatically credited upon completing verified full-duration video campaigns. Transfer to Main or withdraw directly.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={() => openTransferModal('VIDEO_REWARDS')}
              disabled={videoRewardsCents <= 0}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                videoRewardsCents > 0
                  ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>To Main</span>
            </button>
            <button
              onClick={() => navigate?.('withdrawal')}
              disabled={videoRewardsCents <= 0}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                videoRewardsCents > 0
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  : 'bg-slate-50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>

        {/* Wallet 3: Separate Referral Wallet */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Share2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Referral Wallet</h3>
                  <span className="text-[11px] text-slate-400 font-medium">Commissions & Milestones</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Isolated
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="text-[11px] text-slate-500 font-medium">Available Referral Balance</div>
              <div className="text-3xl font-black text-indigo-950 tracking-tight">
                {formatUSD(referralAvailableCents)}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
              Earned from first qualifying transactions of invited users and rank milestones. Transfer to Main or withdraw directly.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={() => openTransferModal('REFERRAL')}
              disabled={referralAvailableCents <= 0}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                referralAvailableCents > 0
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>To Main</span>
            </button>
            <button
              onClick={() => navigate?.('withdrawal')}
              disabled={referralAvailableCents <= 0}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                referralAvailableCents > 0
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  : 'bg-slate-50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>
      </div>

      {/* Optional 4th Card: Approved Other Rewards */}
      {otherRewardsCents > 0 && (
        <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900">Approved Other Rewards</div>
              <div className="text-[11px] text-amber-700">
                Special promotional bonuses or administrative adjustments credited to your account.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-amber-900">{formatUSD(otherRewardsCents)}</span>
            <button
              onClick={() => navigate?.('withdrawal')}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
            >
              Withdraw
            </button>
          </div>
        </div>
      )}

      {/* Transfer to Main Account Credits Modal */}
      {transferSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xl relative">
            <button
              onClick={() => setTransferSource(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-2">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {transferSource === 'VIDEO_REWARDS'
                  ? 'Transfer Video Rewards to Main Credits'
                  : 'Transfer Referral Wallet to Main Credits'}
              </h3>
              <p className="text-xs text-slate-500">
                Move funds into your Main Account Credits to unlock packages or combine balances for withdrawal.
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
                    Max ({formatUSD(activeSourceCents)})
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
                    onChange={(e) => setTransferAmountInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {!transferSuccess && parseFloat(transferAmountInput) > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Source Wallet After:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {formatUSD(Math.max(0, activeSourceCents - Math.round(parseFloat(transferAmountInput) * 100)))}
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

              {transferSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{transferSuccess}</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 pl-6">
                    Updated Main Account Credits: <strong>{formatUSD(mainAvailableCents)}</strong>
                  </div>
                </div>
              )}

              {transferError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{transferError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={transferring || !(parseFloat(transferAmountInput) > 0)}
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
          <span className="text-xs text-slate-400">Total Entries: {total}</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading ledger entries...</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No financial transactions recorded yet. Submit a USD deposit or complete a video campaign to see ledger entries.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">Reference / Time</th>
                  <th className="py-3 px-6">Transaction Type</th>
                  <th className="py-3 px-6">Description</th>
                  <th className="py-3 px-6">Wallet Account</th>
                  <th className="py-3 px-6 text-right">Entry / Amount</th>
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
                        <span className={isCredit ? 'text-emerald-600' : 'text-slate-800'}>
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
