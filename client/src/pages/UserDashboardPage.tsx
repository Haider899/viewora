import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { WalletPage } from './WalletPage.js';
import { VideoCatalogPage } from './VideoCatalogPage.js';
import { VideoPlayerPage } from './VideoPlayerPage.js';
import { PackagesPage } from './PackagesPage.js';
import { DepositPage } from './DepositPage.js';
import { WithdrawalPage } from './WithdrawalPage.js';
import { ReferralsPage } from './ReferralsPage.js';
import { SupportChatWidget } from '../components/SupportChatWidget.js';
import {
  Wallet,
  PlaySquare,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  LogOut,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export const UserDashboardPage: React.FC = () => {
  const { user, wallet, logout, refreshWallet } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'player' | 'packages' | 'deposit' | 'withdrawal' | 'referrals'>('overview');
  const [activePlayerVideoId, setActivePlayerVideoId] = useState<string | null>(null);

  const navigateInternal = (target: string, state?: any) => {
    if (target === 'player' && state?.videoId) {
      setActivePlayerVideoId(state.videoId);
      setActiveTab('player');
    } else if (target === 'videos') {
      setActiveTab('videos');
    } else if (target === 'packages') {
      setActiveTab('packages');
    } else if (target === 'deposit') {
      setActiveTab('deposit');
    } else if (target === 'withdrawal') {
      setActiveTab('withdrawal');
    } else if (target === 'wallet' || target === 'overview') {
      setActiveTab('overview');
    } else if (target === 'referrals') {
      setActiveTab('referrals');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navItemClass = (tab: string) =>
    `px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
      activeTab === tab
        ? 'bg-emerald-600 text-white shadow-sm'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* User Dashboard Top Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <PlaySquare className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                Vistara<span className="text-emerald-600">X</span>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  User Portal
                </span>
              </span>
            </div>
          </div>

          {/* Dual-Currency Balance Pill & Profile */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Real-time Balances */}
            <div
              onClick={() => setActiveTab('overview')}
              className="cursor-pointer flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-500 transition-colors shadow-2xs"
            >
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                <span className="text-slate-400 font-semibold text-[11px]">USD:</span>
                <span>${((wallet?.USD?.availableCents ?? 0) / 100).toFixed(2)}</span>
              </div>
              <div className="h-3.5 w-px bg-slate-300"></div>
              <div className="flex items-center gap-1 text-xs font-bold text-teal-700">
                <span className="text-slate-400 font-semibold text-[11px]">PKR:</span>
                <span>Rs {((wallet?.PKR?.availableCents ?? 0) / 100).toLocaleString()}</span>
              </div>
            </div>

            {/* User Profile Info & Logout */}
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-slate-900">{user?.fullName}</div>
                <div className="text-[10px] text-slate-500 font-medium">{user?.email}</div>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-slate-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Portal Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 scrollbar-none">
          <button onClick={() => setActiveTab('overview')} className={navItemClass('overview')}>
            <Wallet className="w-4 h-4" />
            Wallet & Overview
          </button>
          <button onClick={() => setActiveTab('videos')} className={navItemClass('videos')}>
            <PlaySquare className="w-4 h-4" />
            Video Catalog (60)
          </button>
          <button onClick={() => setActiveTab('packages')} className={navItemClass('packages')}>
            <Layers className="w-4 h-4" />
            Plans & Packages
          </button>
          <button onClick={() => setActiveTab('deposit')} className={navItemClass('deposit')}>
            <ArrowDownLeft className="w-4 h-4" />
            Deposit Funds
          </button>
          <button onClick={() => setActiveTab('withdrawal')} className={navItemClass('withdrawal')}>
            <ArrowUpRight className="w-4 h-4" />
            Withdrawal Payout
          </button>
          <button onClick={() => setActiveTab('referrals')} className={navItemClass('referrals')}>
            <Users className="w-4 h-4" />
            Referrals & Commissions
          </button>
        </div>
      </header>

      {/* Main Portal View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Greeting & Action Bar */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                  Member Portal
                </span>
                <h1 className="text-2xl font-extrabold text-slate-900">
                  Welcome back, {user?.fullName}!
                </h1>
                <p className="text-xs text-slate-500">
                  Manage your dual-currency balances, stream verified masterclasses, and view financial ledger journals.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setActiveTab('deposit')}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm flex items-center gap-1.5"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Deposit Funds
                </button>
                <button
                  onClick={() => setActiveTab('withdrawal')}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-all flex items-center gap-1.5"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Request Payout
                </button>
                <button
                  onClick={() => setActiveTab('videos')}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all flex items-center gap-1.5"
                >
                  <PlaySquare className="w-4 h-4" />
                  Watch Videos
                </button>
              </div>
            </div>

            {/* Wallet Section (Cards & Immutable Journal) */}
            <WalletPage navigate={navigateInternal} />
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs">
            <VideoCatalogPage navigate={navigateInternal} />
          </div>
        )}

        {activeTab === 'player' && activePlayerVideoId && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs">
            <VideoPlayerPage videoId={activePlayerVideoId} navigate={navigateInternal} />
          </div>
        )}

        {activeTab === 'packages' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs">
            <PackagesPage navigate={navigateInternal} />
          </div>
        )}

        {activeTab === 'deposit' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs">
            <DepositPage navigate={navigateInternal} />
          </div>
        )}

        {activeTab === 'withdrawal' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs">
            <WithdrawalPage navigate={navigateInternal} />
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs">
            <ReferralsPage navigate={navigateInternal} />
          </div>
        )}
      </main>

      {/* Clean User Portal Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} VistaraX Platform. Secure Double-Entry Audited Engine.</p>
      </footer>

      {/* Floating Customer Support Live Chat & Bot */}
      <SupportChatWidget />
    </div>
  );
};

export default UserDashboardPage;
