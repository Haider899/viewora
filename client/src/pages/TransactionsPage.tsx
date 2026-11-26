import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api.js';
import { LedgerEntryItem } from '../types/index.js';
import { useToast } from '../components/ToastProvider.js';
import {
  formatUSD,
  formatDateTime,
  groupLedgerEntries,
  getTonePillClass,
  humanizeWalletName,
} from '../utils/formatters.js';
import {
  Search,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Layers,
  Repeat,
  Receipt,
  Check,
  Copy,
} from 'lucide-react';

interface TransactionsPageProps {
  navigate?: (route: string) => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({ navigate }) => {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<LedgerEntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [walletFilter, setWalletFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | '7D' | '30D'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRef, setExpandedRef] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const fetchHistory = async (pageNum = 1, isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.getTransactions(pageNum, 60);
      if (res.success && res.data) {
        setEntries(res.data.entries || []);
        setTotal(res.data.total || 0);
        setPage(res.data.page || 1);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
      showToast('Could not load transaction history.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, []);

  const grouped = useMemo(() => groupLedgerEntries(entries), [entries]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return grouped.filter((row) => {
      if (walletFilter !== 'ALL') {
        const matchesWallet =
          row.walletKey === walletFilter ||
          row.legs.some((l) => l.account?.accountType === walletFilter);
        if (!matchesWallet) return false;
      }
      if (typeFilter !== 'ALL' && row.category !== typeFilter) return false;
      if (dateFilter === '7D' && now - new Date(row.createdAt).getTime() > 7 * 86400000) return false;
      if (dateFilter === '30D' && now - new Date(row.createdAt).getTime() > 30 * 86400000) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hit =
          row.label.toLowerCase().includes(q) ||
          row.description.toLowerCase().includes(q) ||
          row.reference.toLowerCase().includes(q) ||
          row.walletLabel.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [grouped, walletFilter, typeFilter, dateFilter, searchQuery]);

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      showToast('No transactions to export.', 'info');
      return;
    }
    const headers = ['Date', 'Type', 'Description', 'Wallet', 'Amount (USD)', 'Reference'];
    const csvRows = [
      headers.join(','),
      ...filtered.map((r) => {
        const amt = (r.signedCents / 100).toFixed(2);
        return [
          `"${formatDateTime(r.createdAt)}"`,
          `"${r.label}"`,
          `"${r.description.replace(/"/g, '""')}"`,
          `"${r.walletLabel}"`,
          amt,
          `"${r.reference}"`,
        ].join(',');
      }),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `u-ads-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${filtered.length} transactions to CSV.`, 'success');
  };

  const handleCopyRef = (ref: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    showToast('Reference copied to clipboard.', 'success');
    setTimeout(() => setCopiedRef(null), 1800);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'deposit':
        return <ArrowDownLeft className="w-4 h-4 text-emerald-600" />;
      case 'withdrawal':
        return <ArrowUpRight className="w-4 h-4 text-slate-600" />;
      case 'reward':
      case 'referral':
        return <Sparkles className="w-4 h-4 text-emerald-600" />;
      case 'package':
        return <Layers className="w-4 h-4 text-slate-600" />;
      default:
        return <Repeat className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-page-in">
      {/* Toolbar & Filters */}
      <div className="card-white p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by description, wallet, or reference..."
              className="w-full h-10 pl-10 pr-4 rounded-[10px] bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchHistory(page, true)}
              disabled={refreshing}
              className="btn-secondary"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
            <button type="button" onClick={handleExportCSV} className="btn-secondary">
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
          <select
            value={walletFilter}
            onChange={(e) => setWalletFilter(e.target.value)}
            className="h-9 px-3 rounded-[10px] bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Wallets</option>
            <option value="USER_VIDEO_REWARDS">Video Ad Rewards</option>
            <option value="USER_REFERRAL">Referral Wallet</option>
            <option value="USER_OTHER_REWARDS">Bonuses Wallet</option>
            <option value="USER_AVAILABLE">Subscription Credit</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-3 rounded-[10px] bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Types</option>
            <option value="deposit">Deposits</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="reward">Video &amp; Daily Rewards</option>
            <option value="referral">Referral Rewards</option>
            <option value="package">Plan Purchases</option>
            <option value="transfer">Wallet Transfers</option>
          </select>

          <div className="inline-flex rounded-[10px] bg-slate-100 p-0.5 border border-slate-200">
            {([
              { id: 'ALL', label: 'All Time' },
              { id: '7D', label: '7 Days' },
              { id: '30D', label: '30 Days' },
            ] as const).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDateFilter(d.id)}
                className={`px-3 py-1 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
                  dateFilter === d.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <span className="ml-auto text-xs text-slate-500 tabular-nums">
            Showing <strong className="text-slate-900">{filtered.length}</strong> event{filtered.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Transactions List */}
      <div className="card-white overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-14 rounded-xl skeleton-shimmer" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No matching transactions</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {entries.length === 0
                ? 'Your USD deposits, video rewards, referrals, and withdrawals will appear here with full transparency.'
                : 'Try clearing one of your filters or search terms to see more transactions.'}
            </p>
            {entries.length === 0 && navigate ? (
              <div className="pt-2">
                <button type="button" onClick={() => navigate('deposit')} className="btn-primary">
                  Make Your First Deposit
                </button>
              </div>
            ) : entries.length > 0 ? (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setWalletFilter('ALL');
                    setTypeFilter('ALL');
                    setDateFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="btn-secondary"
                >
                  Clear Filters
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((row) => {
              const isExpanded = expandedRef === row.reference;
              const isCredit = row.signedCents > 0 && !row.isInternalTransfer;
              const isDebit = row.signedCents < 0;

              return (
                <div key={row.id} className="transition-colors">
                  <button
                    type="button"
                    onClick={() => setExpandedRef(isExpanded ? null : row.reference)}
                    className="w-full text-left px-4 sm:px-6 py-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
                        {getCategoryIcon(row.category)}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{row.label}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTonePillClass(
                              row.tone
                            )}`}
                          >
                            {row.walletLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-snug">{row.description}</p>
                        <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                          <span>{formatDateTime(row.createdAt)}</span>
                          <span>·</span>
                          <span className="font-mono text-slate-500">{row.shortReference}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div
                          className={`text-sm font-extrabold tabular-nums ${
                            row.isInternalTransfer
                              ? 'text-slate-800'
                              : isCredit
                              ? 'text-emerald-600'
                              : isDebit
                              ? 'text-rose-600'
                              : 'text-slate-900'
                          }`}
                        >
                          {row.isInternalTransfer
                            ? formatUSD(row.amountCents)
                            : formatUSD(row.signedCents, true)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {row.legs.length > 1 ? 'Double-entry' : 'Verified'}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Expandable Double-Entry Audit Transparency */}
                  {isExpanded && (
                    <div className="px-4 sm:px-6 pb-4 pt-1 bg-slate-50/70 border-t border-slate-100 space-y-3 animate-dropdown-in">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-slate-500 font-semibold">Full Reference ID</span>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-[11px] bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800">
                            {row.reference}
                          </code>
                          <button
                            type="button"
                            onClick={(e) => handleCopyRef(row.reference, e)}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 cursor-pointer"
                            title="Copy reference"
                          >
                            {copiedRef === row.reference ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                        <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Double-Entry Ledger Breakdown
                        </div>
                        <div className="divide-y divide-slate-100">
                          {row.legs.map((leg) => (
                            <div
                              key={leg.id}
                              className="px-3.5 py-2.5 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                    leg.entryType === 'CREDIT'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}
                                >
                                  {leg.entryType === 'CREDIT' ? 'Credit' : 'Debit'}
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {humanizeWalletName(leg.account?.accountType)}
                                </span>
                              </div>
                              <span
                                className={`font-bold tabular-nums ${
                                  leg.entryType === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {leg.entryType === 'CREDIT' ? '+' : '-'}
                                {formatUSD(leg.amountCents)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {total > entries.length && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => fetchHistory(page + 1)}
            className="btn-secondary"
          >
            Load Next Page
          </button>
        </div>
      )}
    </div>
  );
};
