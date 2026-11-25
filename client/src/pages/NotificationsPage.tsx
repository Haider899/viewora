import React, { useState } from 'react';
import { NotificationItem } from '../types/index.js';
import { formatRelativeTime, formatDateTime } from '../utils/formatters.js';
import {
  Bell,
  CheckCheck,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Users,
  ShieldCheck,
  MessageCircle,
  ChevronRight,
} from 'lucide-react';

interface NotificationsPageProps {
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onSelectNotification: (n: NotificationItem) => void;
}

export function getNotificationDestination(n: NotificationItem): string {
  const hay = `${n.title} ${n.message || n.body || ''}`.toLowerCase();
  if (hay.includes('deposit')) return 'deposit';
  if (hay.includes('withdraw') || hay.includes('payout')) return 'withdrawal';
  if (hay.includes('referral') || hay.includes('rank') || hay.includes('milestone')) return 'referrals';
  if (hay.includes('video') || hay.includes('reward')) return 'videos';
  if (hay.includes('support') || hay.includes('ticket') || hay.includes('chat')) return 'support';
  if (hay.includes('package') || hay.includes('plan')) return 'packages';
  if (hay.includes('level') || hay.includes('account') || hay.includes('password')) return 'profile';
  return 'overview';
}

export function getNotificationIcon(n: NotificationItem) {
  const hay = `${n.title} ${n.message || n.body || ''}`.toLowerCase();
  if (hay.includes('deposit')) return <ArrowDownLeft className="w-4 h-4 text-emerald-600" />;
  if (hay.includes('withdraw') || hay.includes('payout')) return <ArrowUpRight className="w-4 h-4 text-slate-600" />;
  if (hay.includes('referral') || hay.includes('rank')) return <Users className="w-4 h-4 text-emerald-600" />;
  if (hay.includes('support') || hay.includes('chat')) return <MessageCircle className="w-4 h-4 text-slate-600" />;
  if (hay.includes('lock') || hay.includes('password') || hay.includes('security')) {
    return <ShieldCheck className="w-4 h-4 text-amber-600" />;
  }
  return <Sparkles className="w-4 h-4 text-emerald-600" />;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  unreadCount,
  onMarkAllRead,
  onSelectNotification,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [markingAll, setMarkingAll] = useState(false);

  const visible = filter === 'UNREAD' ? notifications.filter((n) => !n.isRead) : notifications;

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await onMarkAllRead();
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-6 animate-page-in">
      {/* Header Controls */}
      <div className="card-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-[10px] bg-slate-100 p-0.5 border border-slate-200">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
              filter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('UNREAD')}
            className={`px-3.5 py-1.5 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
              filter === 'UNREAD' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        <button
          type="button"
          onClick={handleMarkAll}
          disabled={unreadCount === 0 || markingAll}
          className="btn-secondary"
        >
          <CheckCheck className="w-4 h-4 text-emerald-600" />
          <span>{markingAll ? 'Updating…' : 'Mark all read'}</span>
        </button>
      </div>

      {/* Notification List */}
      <div className="card-white overflow-hidden">
        {visible.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {filter === 'UNREAD' ? 'You are all caught up' : 'No notifications yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Updates about your USD deposits, withdrawals, video rewards, and referral milestones will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visible.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onSelectNotification(n)}
                className={`w-full text-left px-5 py-4 flex items-start gap-3.5 transition-colors cursor-pointer ${
                  n.isRead ? 'bg-white hover:bg-slate-50' : 'bg-emerald-50/40 hover:bg-emerald-50/70'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  {getNotificationIcon(n)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-bold text-slate-900 truncate">{n.title}</span>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />}
                    </div>
                    <span
                      className="text-[11px] text-slate-400 whitespace-nowrap shrink-0"
                      title={formatDateTime(n.createdAt)}
                    >
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {n.message || n.body || 'Account activity update.'}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 self-center" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
