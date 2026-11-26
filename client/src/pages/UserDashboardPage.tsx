import React, { useState, useEffect, useRef } from 'react';
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
import { TransactionsPage } from './TransactionsPage.js';
import {
  NotificationsPage,
  getNotificationDestination,
  getNotificationIcon,
} from './NotificationsPage.js';
import { ProfilePage } from './ProfilePage.js';
import { SettingsPage } from './SettingsPage.js';
import { SupportPage } from './SupportPage.js';
import { SupportChatWidget } from '../components/SupportChatWidget.js';
import { LiveActivityPopups } from '../components/LiveActivityPopups.js';
import { useToast } from '../components/ToastProvider.js';
import { AdminDirectMessageItem } from '../types/index.js';
import {
  formatUSD,
  formatAccountLevelLabel,
  formatRelativeTime,
  getAccountLevelProgress,
  getInitials,
} from '../utils/formatters.js';
import {
  LayoutDashboard,
  PlaySquare,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Users,
  Headphones,
  User as UserIcon,
  Settings,
  LogOut,
  Bell,
  ChevronDown,
  Copy,
  Check,
  CheckCheck,
  Award,
  X,
} from 'lucide-react';

export { formatAccountLevelLabel } from '../utils/formatters.js';

type UserTab =
  | 'overview'
  | 'videos'
  | 'player'
  | 'packages'
  | 'deposit'
  | 'withdrawal'
  | 'transactions'
  | 'referrals'
  | 'support'
  | 'profile'
  | 'settings'
  | 'notifications';

const PAGE_TITLES: Record<UserTab, { title: string; subtitle: string }> = {
  overview: { title: 'Dashboard', subtitle: 'Your earnings, packages, and daily ads' },
  videos: { title: 'Ads', subtitle: 'Watch verified ads to earn your 95% ad-revenue share' },
  player: { title: 'Ad Player', subtitle: 'Full-duration verified playback' },
  packages: { title: 'Packages', subtitle: 'Lifetime subscriptions — bigger packages earn more per ad' },
  deposit: { title: 'Deposit', subtitle: 'Add USD subscription credit to activate or upgrade a package' },
  withdrawal: { title: 'Withdraw', subtitle: 'Withdraw your earned rewards to USDT, Binance, or Bank Wire' },
  transactions: { title: 'Transactions', subtitle: 'Complete USD activity and double-entry records' },
  referrals: { title: 'Referrals', subtitle: 'Commissions, ranks, and invitation network' },
  support: { title: 'Support', subtitle: '24/7 account help and live specialists' },
  profile: { title: 'Profile', subtitle: 'Personal details, Member ID, and account standing' },
  settings: { title: 'Settings', subtitle: 'Password, notifications, and active session' },
  notifications: { title: 'Notifications', subtitle: 'Alerts and direct messages from U-Ads Administration' },
};

export const UserDashboardPage: React.FC = () => {
  const { user, wallet, logout, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<UserTab>('overview');
  const [activePlayerVideoId, setActivePlayerVideoId] = useState<string | null>(null);
  const [packagesAutoSelectTier, setPackagesAutoSelectTier] = useState<string | null>(null);

  // Live Referral Rank summary (for sidebar card, avatar menu, and dashboard)
  const [referralRank, setReferralRank] = useState<string>('New');
  const [qualifiedReferrals, setQualifiedReferrals] = useState<number>(0);

  // Notifications + Admin Direct Messages (Part 6 #2)
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [directMessages, setDirectMessages] = useState<AdminDirectMessageItem[]>([]);
  const [viewingDirectMsg, setViewingDirectMsg] = useState<AdminDirectMessageItem | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Top bar dropdowns (only one open at a time)
  const [openMenu, setOpenMenu] = useState<'none' | 'balance' | 'notif' | 'avatar'>('none');
  const [copiedId, setCopiedId] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);

  const topBarRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (topBarRef.current && !topBarRef.current.contains(e.target as Node)) {
        setOpenMenu('none');
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu('none');
        setSignOutConfirmOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const [res, dmRes] = await Promise.all([
        api.getNotifications(1, 50),
        api.getMyDirectMessages().catch(() => ({ success: false, data: [] })),
      ]);
      let notifUnread = 0;
      if (res.success && res.data) {
        const list = res.data.notifications || res.data.items || (Array.isArray(res.data) ? res.data : []);
        setNotifications(list);
        notifUnread =
          typeof res.data.unreadCount === 'number'
            ? res.data.unreadCount
            : list.filter((n: NotificationItem) => !n.isRead).length;
      }
      let dmUnread = 0;
      if (dmRes.success && Array.isArray(dmRes.data)) {
        setDirectMessages(dmRes.data);
        dmUnread = dmRes.data.filter((m: AdminDirectMessageItem) => !m.isRead).length;
      }
      setUnreadCount(notifUnread + dmUnread);
    } catch {
      // silent
    }
  };

  const loadRankSummary = async () => {
    try {
      const res = await api.getReferralRankProgress();
      if (res.success && res.data) {
        setReferralRank(res.data.currentRank || 'New');
        setQualifiedReferrals(res.data.qualifiedReferrals || 0);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    refreshUser();
    loadNotifications();
    loadRankSummary();
    const interval = setInterval(() => {
      loadNotifications();
      refreshUser();
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id: string) => {
    await api.markNotificationRead(id).catch(() => {});
    await loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead().catch(() => {});
    await loadNotifications();
    showToast('All notifications marked as read.', 'success');
  };

  const navigateInternal = (target: string, state?: any) => {
    setOpenMenu('none');
    if (target === 'player' && state?.videoId) {
      setActivePlayerVideoId(state.videoId);
      setActiveTab('player');
    } else if (target === 'packages') {
      setPackagesAutoSelectTier(state?.autoSelectTier || null);
      setActiveTab('packages');
    } else if (
      [
        'overview',
        'videos',
        'deposit',
        'withdrawal',
        'transactions',
        'referrals',
        'support',
        'profile',
        'settings',
        'notifications',
      ].includes(target)
    ) {
      setPackagesAutoSelectTier(null);
      setActiveTab(target as UserTab);
      if (target === 'overview') refreshUser();
    } else if (target === 'wallet') {
      setPackagesAutoSelectTier(null);
      setActiveTab('overview');
      refreshUser();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    setOpenMenu('none');
    if (!n.isRead) {
      await handleMarkRead(n.id);
    }
    const dest = getNotificationDestination(n);
    navigateInternal(dest);
  };

  const handleCopyMemberId = () => {
    if (!user?.memberCode) return;
    navigator.clipboard.writeText(user.memberCode);
    setCopiedId(true);
    showToast('Member ID copied.', 'success');
    setTimeout(() => setCopiedId(false), 1800);
  };

  // Part 1 Rule 3: ONLY show earned balances (Video Ad Rewards + Referral + Bonuses) — NEVER paid-in deposit money!
  const videoCents = wallet?.USD?.videoRewardsCents ?? 0;
  const referralCents = wallet?.USD?.referralCents ?? 0;
  const otherCents = wallet?.USD?.otherRewardsCents ?? 0;
  const totalEarningsCents = videoCents + referralCents + otherCents;
  const levelProgress = user?.levelProgress
    ? {
        currentLabel: user.levelProgress.currentLevelName,
        nextLabel: user.levelProgress.nextLevelName,
        percent: user.levelProgress.progressPercent,
        neededCents: user.levelProgress.neededCents,
      }
    : getAccountLevelProgress(user?.accountLevel, 0);

  const navGroups: Array<{
    label: string;
    items: Array<{ id: UserTab; label: string; icon: React.ReactNode }>;
  }> = [
    {
      label: 'Overview',
      items: [{ id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> }],
    },
    {
      label: 'Earn',
      items: [
        { id: 'videos', label: 'Ads', icon: <PlaySquare className="w-4 h-4" /> },
        { id: 'packages', label: 'Packages', icon: <Layers className="w-4 h-4" /> },
      ],
    },
    {
      label: 'Money',
      items: [
        { id: 'deposit', label: 'Deposit', icon: <ArrowDownLeft className="w-4 h-4" /> },
        { id: 'withdrawal', label: 'Withdraw', icon: <ArrowUpRight className="w-4 h-4" /> },
        { id: 'transactions', label: 'Transactions', icon: <Receipt className="w-4 h-4" /> },
      ],
    },
    {
      label: 'Grow',
      items: [{ id: 'referrals', label: 'Referrals', icon: <Users className="w-4 h-4" /> }],
    },
    {
      label: 'Help',
      items: [{ id: 'support', label: 'Support', icon: <Headphones className="w-4 h-4" /> }],
    },
    {
      label: 'Account',
      items: [
        { id: 'profile', label: 'Profile', icon: <UserIcon className="w-4 h-4" /> },
        { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ];

  const pageMeta = PAGE_TITLES[activeTab] || PAGE_TITLES.overview;
  // Issue #17a: Single unread count source (always matches bell badge & dropdown header)
  const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* DESKTOP LEFT SIDEBAR (240px on xl+, collapses to 72px icon rail on md–lg) */}
      <aside className="hidden md:flex flex-col w-[72px] xl:w-[240px] shrink-0 bg-white border-r border-slate-200/90 sticky top-0 h-screen transition-all duration-200 z-30">
        {/* Clean Brand Logo (no "MEMBER PORTAL" pill) */}
        <button
          type="button"
          onClick={() => navigateInternal('overview')}
          className="h-[60px] px-4 xl:px-5 border-b border-slate-100 flex items-center justify-center xl:justify-start gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-xs group-hover:from-orange-600 group-hover:to-amber-600 transition-colors shrink-0">
            <PlaySquare className="w-5 h-5 text-white stroke-[2.3]" />
          </div>
          <span className="hidden xl:inline text-lg font-extrabold tracking-tight text-slate-900">
            U-<span className="text-orange-600">ADS</span>
          </span>
        </button>

        {/* Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 xl:px-3 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="hidden xl:block px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.label}
              </div>
              {group.items.map((item) => {
                const isActive =
                  activeTab === item.id || (item.id === 'videos' && activeTab === 'player');
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateInternal(item.id)}
                    title={item.label}
                    className={`w-full relative flex items-center justify-center xl:justify-start gap-3 px-2.5 xl:px-3 h-10 rounded-[10px] text-xs font-bold transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-orange-50 text-orange-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-orange-500" />
                    )}
                    <span className={isActive ? 'text-orange-600' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span className="hidden xl:inline truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Pinned Bottom Level Progress Card */}
        <div className="p-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={() => navigateInternal('profile')}
            title={`${formatAccountLevelLabel(user?.accountLevel)} · ${referralRank} Rank`}
            className="w-full p-2.5 xl:p-3.5 rounded-xl bg-orange-50/50 hover:bg-orange-50 border border-orange-200/70 text-left transition-all cursor-pointer space-y-2"
          >
            <div className="flex items-center justify-center xl:justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Award className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="hidden xl:inline text-xs font-extrabold text-slate-900 truncate">
                  {formatAccountLevelLabel(user?.accountLevel)}
                </span>
              </div>
              <span className="hidden xl:inline text-[10px] font-bold text-orange-700 bg-white px-1.5 py-0.5 rounded border border-orange-200 shrink-0">
                {referralRank}
              </span>
            </div>
            <div className="hidden xl:block space-y-1">
              <div className="w-full h-1.5 rounded-full bg-orange-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-orange-500 transition-all duration-300"
                  style={{ width: `${levelProgress.percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>{levelProgress.nextLabel ? `Next: ${levelProgress.nextLabel}` : 'Max Level'}</span>
                <span className="font-bold tabular-nums">{levelProgress.percent}%</span>
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* RIGHT WORKSPACE COLUMN */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* SLIM SINGLE-ROW TOP BAR (60px) */}
        <header
          ref={topBarRef}
          className="sticky top-0 z-30 h-[60px] bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between gap-3"
        >
          {/* Left: Mobile Avatar OR Desktop Page Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === 'avatar' ? 'none' : 'avatar')}
              className="md:hidden w-9 h-9 rounded-full bg-slate-900 text-white text-xs font-extrabold flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Account menu"
            >
              {getInitials(user?.fullName)}
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate leading-tight">
                {pageMeta.title}
              </h1>
              <p className="hidden sm:block text-[11px] text-slate-500 truncate leading-tight">
                {pageMeta.subtitle}
              </p>
            </div>
          </div>

          {/* Right: Combined Balance Dropdown · Bell · Avatar Menu */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* 1. Earnings-Only Balance Dropdown (Rule 3: NEVER includes paid-in deposit money!) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === 'balance' ? 'none' : 'balance')}
                className={`h-9 px-3 rounded-[10px] border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  openMenu === 'balance'
                    ? 'bg-orange-50 border-orange-300 text-orange-800'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                }`}
              >
                <span className="tabular-nums font-extrabold">{formatUSD(totalEarningsCents)}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                    openMenu === 'balance' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openMenu === 'balance' && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden animate-dropdown-in">
                  <div className="px-4 py-3 bg-orange-50/60 border-b border-orange-100">
                    <div className="text-[11px] font-semibold text-orange-800">Total Withdrawable Earnings</div>
                    <div className="text-lg font-extrabold text-slate-900 tabular-nums">
                      {formatUSD(totalEarningsCents)}
                    </div>
                  </div>
                  <div className="p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-50">
                      <span className="text-slate-600 font-medium">Video Ad Rewards</span>
                      <span className="font-bold text-emerald-700 tabular-nums">{formatUSD(videoCents)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-50">
                      <span className="text-slate-600 font-medium">Referral Earnings</span>
                      <span className="font-bold text-emerald-700 tabular-nums">{formatUSD(referralCents)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-50">
                      <span className="text-slate-600 font-medium">Bonuses</span>
                      <span className="font-bold text-emerald-700 tabular-nums">{formatUSD(otherCents)}</span>
                    </div>
                  </div>
                  <div className="p-3 pt-0 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => navigateInternal('deposit')}
                      className="btn-primary !h-9 w-full"
                    >
                      Deposit
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateInternal('withdrawal')}
                      className="btn-secondary !h-9 w-full"
                    >
                      Withdraw
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Notification Bell (True unread count, single source, 99+ cap) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  const next = openMenu === 'notif' ? 'none' : 'notif';
                  setOpenMenu(next);
                  if (next === 'notif') loadNotifications();
                }}
                className={`relative w-9 h-9 rounded-[10px] border flex items-center justify-center transition-colors cursor-pointer ${
                  openMenu === 'notif'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                    {unreadLabel}
                  </span>
                )}
              </button>

              {openMenu === 'notif' && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden animate-dropdown-in">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Notifications ({unreadCount} unread)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {/* Admin Direct Messages (Part 6 #2) */}
                    {directMessages.length > 0 && (
                      <div className="bg-orange-50/40">
                        <div className="px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-orange-700 border-b border-orange-100">
                          Messages from U-Ads Administration
                        </div>
                        {directMessages.slice(0, 4).map((dm) => (
                          <button
                            key={dm.id}
                            type="button"
                            onClick={async () => {
                              setOpenMenu('none');
                              setViewingDirectMsg(dm);
                              if (!dm.isRead) {
                                await api.markDirectMessageRead(dm.id).catch(() => {});
                                loadNotifications();
                              }
                            }}
                            className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer ${
                              dm.isRead ? 'bg-white hover:bg-slate-50' : 'bg-orange-50/70 hover:bg-orange-100/60'
                            }`}
                          >
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-extrabold text-slate-900 truncate">
                                  📩 {dm.subject}
                                </span>
                                {!dm.isRead && <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />}
                              </div>
                              <p className="text-[11px] text-slate-600 line-clamp-2">{dm.message}</p>
                              <div className="text-[10px] text-slate-400">
                                {dm.attachmentUrl ? '📎 Screenshot attached · ' : ''}
                                {formatRelativeTime(dm.createdAt)}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {notifications.length === 0 && directMessages.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleNotificationClick(n)}
                          className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer ${
                            n.isRead ? 'bg-white hover:bg-slate-50' : 'bg-emerald-50/40 hover:bg-emerald-50/80'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                            {getNotificationIcon(n)}
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900 truncate">{n.title}</span>
                              {!n.isRead && <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />}
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-2 leading-snug">
                              {n.message || n.body || 'Account activity update'}
                            </p>
                            <div className="text-[10px] text-slate-400">
                              {formatRelativeTime(n.createdAt)}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="p-2.5 bg-slate-50 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => navigateInternal('notifications')}
                      className="w-full py-2 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Avatar Menu (Desktop & Tablet — mobile uses top-left avatar trigger sharing this dropdown) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === 'avatar' ? 'none' : 'avatar')}
                className="hidden md:flex items-center gap-2.5 h-9 pl-1.5 pr-2.5 rounded-[10px] border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
                  {getInitials(user?.fullName)}
                </div>
                <div className="hidden lg:block text-left leading-tight">
                  <div className="text-xs font-bold text-slate-900 max-w-[120px] truncate">
                    {user?.fullName}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold">
                    {formatAccountLevelLabel(user?.accountLevel)}
                  </div>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                    openMenu === 'avatar' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openMenu === 'avatar' && (
                <div className="absolute right-0 mt-2 w-68 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden animate-dropdown-in">
                  {/* Identity Block */}
                  <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-2">
                    <div>
                      <div className="text-sm font-bold text-slate-900 truncate">{user?.fullName}</div>
                      <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                    </div>
                    {user?.memberCode && (
                      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px]">
                        <span className="font-mono font-bold text-slate-700">{user.memberCode}</span>
                        <button
                          type="button"
                          onClick={handleCopyMemberId}
                          className="text-emerald-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedId ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {formatAccountLevelLabel(user?.accountLevel)}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                        {referralRank} Rank
                      </span>
                    </div>
                  </div>

                  {/* Menu Actions */}
                  <div className="p-2 space-y-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => navigateInternal('profile')}
                      className="w-full px-3 py-2 rounded-lg text-left font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 flex items-center gap-2.5 cursor-pointer"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span>Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateInternal('settings')}
                      className="w-full px-3 py-2 rounded-lg text-left font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Settings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateInternal('support')}
                      className="w-full px-3 py-2 rounded-lg text-left font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Headphones className="w-4 h-4 text-slate-400" />
                      <span>Support</span>
                    </button>
                  </div>

                  <div className="p-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu('none');
                        setSignOutConfirmOpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MAIN PAGE CONTENT (key={activeTab} ensures smooth 200ms fade/slide on every page transition #16) */}
        <main
          key={activeTab}
          className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-10 animate-page-in"
        >
          {activeTab === 'overview' && (
            <WalletPage navigate={navigateInternal} referralRank={referralRank} />
          )}
          {activeTab === 'videos' && (
            <div className="animate-page-in">
              <VideoCatalogPage navigate={navigateInternal} />
            </div>
          )}
          {activeTab === 'player' && activePlayerVideoId && (
            <div className="animate-page-in">
              <VideoPlayerPage videoId={activePlayerVideoId} navigate={navigateInternal} />
            </div>
          )}
          {activeTab === 'packages' && (
            <div className="animate-page-in">
              <PackagesPage
                navigate={navigateInternal}
                autoSelectTier={packagesAutoSelectTier}
                onAutoSelectHandled={() => setPackagesAutoSelectTier(null)}
              />
            </div>
          )}
          {activeTab === 'deposit' && (
            <div className="animate-page-in">
              <DepositPage navigate={navigateInternal} />
            </div>
          )}
          {activeTab === 'withdrawal' && (
            <div className="animate-page-in">
              <WithdrawalPage navigate={navigateInternal} />
            </div>
          )}
          {activeTab === 'transactions' && (
            <TransactionsPage navigate={navigateInternal} />
          )}
          {activeTab === 'referrals' && (
            <div className="animate-page-in">
              <ReferralsPage navigate={navigateInternal} />
            </div>
          )}
          {activeTab === 'support' && <SupportPage />}
          {activeTab === 'profile' && (
            <ProfilePage
              navigate={navigateInternal}
              referralRank={referralRank}
              qualifiedReferrals={qualifiedReferrals}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsPage onRequestSignOut={() => setSignOutConfirmOpen(true)} />
          )}
          {activeTab === 'notifications' && (
            <NotificationsPage
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkRead={handleMarkRead}
              onMarkAllRead={handleMarkAllRead}
              onSelectNotification={handleNotificationClick}
            />
          )}
        </main>

        {/* Minimal Legal-Only Footer on Desktop (Issue #17c: clear spacing around year & brand) */}
        <footer className="hidden md:flex items-center justify-between px-8 py-4 border-t border-slate-200/80 bg-white text-[11px] text-slate-400">
          <span>&copy; {new Date().getFullYear()} U-Ads Platform · USD-only audited ledger</span>
          <button
            type="button"
            onClick={() => navigateInternal('support')}
            className="hover:text-emerald-700 font-semibold transition-colors cursor-pointer"
          >
            Need help? Contact Support
          </button>
        </footer>
      </div>

      {/* MOBILE FIXED BOTTOM NAVIGATION BAR (5 items: Home, Ads, Deposit, Referrals, Profile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 h-16 grid grid-cols-5 items-center">
        {[
          { id: 'overview' as UserTab, label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
          { id: 'videos' as UserTab, label: 'Ads', icon: <PlaySquare className="w-5 h-5" /> },
          { id: 'deposit' as UserTab, label: 'Deposit', icon: <ArrowDownLeft className="w-5 h-5" />, center: true },
          { id: 'referrals' as UserTab, label: 'Referrals', icon: <Users className="w-5 h-5" /> },
          { id: 'profile' as UserTab, label: 'Profile', icon: <UserIcon className="w-5 h-5" /> },
        ].map((item) => {
          const isActive =
            activeTab === item.id || (item.id === 'videos' && activeTab === 'player');
          if (item.center) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateInternal(item.id)}
                className="flex flex-col items-center justify-center -mt-4 cursor-pointer"
              >
                <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/30 flex items-center justify-center transition-transform active:scale-95">
                  {item.icon}
                </span>
                <span className="text-[10px] font-bold text-orange-600 mt-0.5">{item.label}</span>
              </button>
            );
          }
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateInternal(item.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                isActive ? 'text-orange-600' : 'text-slate-500'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Live Activity Popups — Smooth bottom-left rising & fading continuous loop (Part 2 #6) */}
      <LiveActivityPopups />

      {/* Admin Direct Message Viewer Modal with Screenshot Lightbox (Part 6 #2) */}
      {viewingDirectMsg && (
        <div
          onClick={() => setViewingDirectMsg(null)}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full border border-orange-200 p-6 space-y-4 shadow-2xl animate-modal-in"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600">
                  Direct Message from U-Ads Admin
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  {viewingDirectMsg.subject}
                </h3>
                <div className="text-[11px] text-slate-500">
                  {viewingDirectMsg.sender?.fullName || 'Administration'} ·{' '}
                  {formatRelativeTime(viewingDirectMsg.createdAt)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingDirectMsg(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 whitespace-pre-line leading-relaxed">
              {viewingDirectMsg.message}
            </div>
            {viewingDirectMsg.attachmentUrl && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-600">Attached Screenshot:</div>
                <img
                  src={viewingDirectMsg.attachmentUrl}
                  alt={viewingDirectMsg.attachmentName || 'Admin Attachment'}
                  className="w-full max-h-64 object-contain rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setViewingDirectMsg(null)}
              className="btn-primary w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Confirmed Sign Out Modal (onMouseDown stopPropagation ensures first-click always fires cleanly #17f) */}
      {signOutConfirmOpen && (
        <div
          onClick={() => setSignOutConfirmOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 p-6 space-y-5 shadow-2xl relative animate-modal-in"
          >
            <button
              type="button"
              onClick={() => setSignOutConfirmOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="space-y-1.5 pr-6">
              <h3 className="text-base font-bold text-slate-900">Sign out of U-Ads?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                You can sign back in anytime with your email and password.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSignOutConfirmOpen(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignOutConfirmOpen(false);
                  logout();
                }}
                className="btn-destructive flex-1"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Support Shortcut (hidden when already viewing dedicated Support page) */}
      <SupportChatWidget navigate={navigateInternal} hidden={activeTab === 'support'} />
    </div>
  );
};

export default UserDashboardPage;
