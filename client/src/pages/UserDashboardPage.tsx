import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { NotificationItem } from '../types/index.js';
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
  Bell,
  Award,
  Calendar,
  Hash,
  CheckCheck,
  X,
} from 'lucide-react';

export const UserDashboardPage: React.FC = () => {
  const { user, wallet, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'videos' | 'player' | 'packages' | 'deposit' | 'withdrawal' | 'referrals'
  >('overview');
  const [activePlayerVideoId, setActivePlayerVideoId] = useState<string | null>(null);

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications(1, 20);
      if (res.success && res.data) {
        const list = res.data.notifications || res.data.items || (Array.isArray(res.data) ? res.data : []);
        setNotifications(list);
        setUnreadCount(
          typeof res.data.unreadCount === 'number'
            ? res.data.unreadCount
            : list.filter((n: NotificationItem) => !n.isRead).length
        );
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id: string) => {
    await api.markNotificationRead(id).catch(() => {});
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead().catch(() => {});
    loadNotifications();
  };

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
    `px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
      activeTab === tab
        ? 'bg-emerald-600 text-white shadow-sm'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  const totalRewardsCents =
    (wallet?.USD?.videoRewardsCents ?? 0) + (wallet?.USD?.referralCents ?? 0) + (wallet?.USD?.otherRewardsCents ?? 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* User Dashboard Top Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          {/* Logo */}
          <div
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <PlaySquare className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                U-<span className="text-emerald-600">Ads</span>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  Member Portal
                </span>
              </span>
            </div>
          </div>

          {/* USD Balance Pill, Notifications Bell & Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Real-time USD Balance */}
            <div
              onClick={() => setActiveTab('overview')}
              className="cursor-pointer flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-500 transition-colors shadow-2xs"
            >
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                <span className="text-slate-400 font-semibold text-[11px]">Main USD:</span>
                <span>${((wallet?.USD?.availableCents ?? 0) / 100).toFixed(2)}</span>
              </div>
              {totalRewardsCents > 0 && (
                <>
                  <div className="h-3.5 w-px bg-slate-300 hidden sm:block"></div>
                  <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-indigo-700">
                    <span className="text-slate-400 font-semibold text-[11px]">Rewards:</span>
                    <span>${(totalRewardsCents / 100).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  if (!notifOpen) loadNotifications();
                }}
                className="relative p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors border border-slate-200 cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-emerald-600" />
                      Notifications ({unreadCount} unread)
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCheck className="w-3 h-3" />
                          Mark all read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setNotifOpen(false)}
                        className="text-slate-400 hover:text-slate-700 p-0.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => !n.isRead && handleMarkRead(n.id)}
                          className={`p-3.5 text-xs space-y-1 cursor-pointer transition-colors ${
                            n.isRead ? 'bg-white text-slate-500' : 'bg-emerald-50/50 text-slate-900 hover:bg-emerald-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900">{n.title}</span>
                            {!n.isRead && <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{n.body}</p>
                          <div className="text-[10px] text-slate-400">
                            {new Date(n.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Info & Logout */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-slate-900">{user?.fullName}</div>
                <div className="text-[10px] text-slate-500 font-mono">{user?.memberCode || user?.email}</div>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-slate-200 cursor-pointer"
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
            Wallets & Overview
          </button>
          <button onClick={() => setActiveTab('videos')} className={navItemClass('videos')}>
            <PlaySquare className="w-4 h-4" />
            Video Catalog
          </button>
          <button onClick={() => setActiveTab('packages')} className={navItemClass('packages')}>
            <Layers className="w-4 h-4" />
            Plans & Packages
          </button>
          <button onClick={() => setActiveTab('deposit')} className={navItemClass('deposit')}>
            <ArrowDownLeft className="w-4 h-4" />
            Deposit USD
          </button>
          <button onClick={() => setActiveTab('withdrawal')} className={navItemClass('withdrawal')}>
            <ArrowUpRight className="w-4 h-4" />
            Withdraw USD
          </button>
          <button onClick={() => setActiveTab('referrals')} className={navItemClass('referrals')}>
            <Users className="w-4 h-4" />
            Referrals & Ranks
          </button>
        </div>
      </header>

      {/* Main Portal View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Greeting, Account Level, Member Code & Registration Date */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                    U-Ads Member Portal
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Award className="w-3 h-3" />
                    {(user?.accountLevel || 'LEVEL_0').replace('_', ' ')}
                  </span>
                  {user?.memberCode && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      <Hash className="w-3 h-3 text-slate-500" />
                      ID: {user.memberCode}
                    </span>
                  )}
                  {user?.createdAt && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900">
                  Welcome back, {user?.fullName}!
                </h1>
                <p className="text-xs text-slate-500">
                  Manage your USD Main Credits, Video Rewards, and Referral Wallet with full double-entry transparency.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setActiveTab('deposit')}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Deposit USD
                </button>
                <button
                  onClick={() => setActiveTab('withdrawal')}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Request Payout
                </button>
                <button
                  onClick={() => setActiveTab('videos')}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <PlaySquare className="w-4 h-4" />
                  Watch Videos
                </button>
              </div>
            </div>

            {/* Wallet Section (3 USD Wallets + Immutable Journal) */}
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
        <p>© {new Date().getFullYear()} U-Ads Platform. Secure USD Double-Entry Audited Engine.</p>
      </footer>

      {/* Floating Customer Support Live Chat & Bot */}
      <SupportChatWidget />
    </div>
  );
};

export default UserDashboardPage;
