import React, { useState } from 'react';
import { AdminDirectMessageItem, NotificationItem } from '../types/index.js';
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
  Paperclip,
} from 'lucide-react';

interface NotificationsPageProps {
  notifications: NotificationItem[];
  directMessages?: AdminDirectMessageItem[];
  unreadCount: number;
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onSelectNotification: (n: NotificationItem) => void;
  onSelectDirectMessage?: (dm: AdminDirectMessageItem) => void;
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
  directMessages = [],
  unreadCount,
  onMarkAllRead,
  onSelectNotification,
  onSelectDirectMessage,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [markingAll, setMarkingAll] = useState(false);

  const visible = filter === 'UNREAD' ? notifications.filter((n) => !n.isRead) : notifications;
  const visibleDMs = filter === 'UNREAD' ? directMessages.filter((m) => !m.isRead) : directMessages;

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
            All ({notifications.length + directMessages.length})
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

      {/* Direct Messages from U-Ads Administration */}
      {visibleDMs.length > 0 && (
        <div className="card-white overflow-hidden border-orange-200">
          <div className="px-5 py-3 bg-orange-50/70 border-b border-orange-100 flex items-center justify-between">
            <span className="text-xs font-extrabold text-orange-900 uppercase tracking-wider">
              Messages from U-Ads Administration ({visibleDMs.length})
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {visibleDMs.map((dm) => (
              <button
                key={dm.id}
                type="button"
                onClick={() => onSelectDirectMessage?.(dm)}
                className={`w-full text-left px-5 py-4 flex items-start gap-3.5 hover:bg-orange-50/40 transition-colors cursor-pointer ${
                  !dm.isRead ? 'bg-orange-50/30' : ''
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-900 truncate">
                      {dm.subject || 'Message from U-Ads Administration'}
                    </span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {formatRelativeTime(dm.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{dm.message}</p>
                  {dm.attachmentUrl && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                      <Paperclip className="w-3 h-3" /> Attachment included — click to view
                    </span>
                  )}
                </div>
                {!dm.isRead && <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-2" />}
              </button>
            ))}
          </div>
        </div>
      )}

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
