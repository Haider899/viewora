import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api.js';
import { LiveActivityPopupItem } from '../types/index.js';
import { CheckCircle2, X } from 'lucide-react';

interface LiveActivityPopupsProps {
  /** Leave extra bottom offset on mobile when the logged-in bottom tab bar is visible */
  hasBottomNav?: boolean;
}

interface RenderedPopup {
  key: number;
  maskedName: string;
  amountText: string;
  statusText: string;
  timeText: string;
}

const SAMPLE_NAMES = [
  'Ahmad',
  'Sarah',
  'Bilal',
  'Fatima',
  'Usman',
  'Zainab',
  'Hamza',
  'Ayesha',
  'Omar',
  'Mariam',
  'Danish',
  'Hina',
  'Talha',
  'Sana',
  'Kamran',
  'Rabia',
  'Fahad',
  'Nida',
  'Hassan',
  'Zoya',
  'Farhan',
  'Mahnoor',
  'Ibrahim',
  'Alex',
  'David',
  'Sophia',
  'Lucas',
  'Maya',
];

const SAMPLE_STATUSES = ['Payment Successful', 'Successfully Withdrawn'];

const RANDOM_TIMES = [
  '5 seconds ago',
  '12 seconds ago',
  '24 seconds ago',
  '40 seconds ago',
  '1 minute ago',
  '2 minutes ago',
  '3 minutes ago',
  '5 minutes ago',
  '7 minutes ago',
  '10 minutes ago',
  '14 minutes ago',
];

const FALLBACK_WITHDRAWALS: Array<{ amountText: string; eventType: string }> = [
  { amountText: '$25', eventType: 'Payment Successful' },
  { amountText: '$50', eventType: 'Successfully Withdrawn' },
  { amountText: '$120', eventType: 'Payment Successful' },
  { amountText: '$35', eventType: 'Successfully Withdrawn' },
  { amountText: '$85', eventType: 'Payment Successful' },
  { amountText: '$150', eventType: 'Successfully Withdrawn' },
  { amountText: '$45', eventType: 'Payment Successful' },
  { amountText: '$75', eventType: 'Successfully Withdrawn' },
  { amountText: '$210', eventType: 'Payment Successful' },
  { amountText: '$60', eventType: 'Successfully Withdrawn' },
  { amountText: '$95', eventType: 'Payment Successful' },
  { amountText: '$190', eventType: 'Successfully Withdrawn' },
  { amountText: '$40', eventType: 'Payment Successful' },
  { amountText: '$130', eventType: 'Successfully Withdrawn' },
  { amountText: '$240', eventType: 'Payment Successful' },
];

/** Show only the first 3 characters of any username followed by "***" */
export function maskUserName(rawName: string): string {
  const cleaned = (rawName || 'Mem').replace(/[^a-zA-Z0-9]/g, '');
  const prefix = cleaned.slice(0, 3) || 'Mem';
  return `${prefix}***`;
}

function normalizeStatusText(rawEventType?: string, idx = 0): string {
  const text = (rawEventType || '').trim();
  const lower = text.toLowerCase();
  if (!text || lower.includes('withdraw')) {
    return SAMPLE_STATUSES[idx % SAMPLE_STATUSES.length];
  }
  return text;
}

export const LiveActivityPopups: React.FC<LiveActivityPopupsProps> = ({ hasBottomNav = false }) => {
  const [items, setItems] = useState<LiveActivityPopupItem[]>([]);
  const [settings, setSettings] = useState({ enabled: true, intervalSeconds: 6, durationSeconds: 6 });
  const [dismissedAll, setDismissedAll] = useState(false);
  const [activePopup, setActivePopup] = useState<RenderedPopup | null>(null);
  const lastIdxRef = useRef<number>(-1);
  const lastNameIdxRef = useRef<number>(-1);
  const keyCounterRef = useRef<number>(1);

  useEffect(() => {
    let mounted = true;
    api
      .getLivePopups()
      .then((res) => {
        if (!mounted || !res.success || !res.data) return;
        const s = res.data.settings || { enabled: true, intervalSeconds: 6, durationSeconds: 6 };
        setSettings({
          enabled: s.enabled !== false,
          intervalSeconds: Number(s.intervalSeconds) || 6,
          durationSeconds: Number(s.durationSeconds) || 6,
        });
        const activeItems = Array.isArray(res.data.items)
          ? res.data.items.filter((i: any) => i.isActive)
          : [];
        setItems(activeItems);
      })
      .catch(() => {
        // Fallback seamlessly to sample withdrawal pool if network unavailable
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (dismissedAll || !settings.enabled) {
      setActivePopup(null);
      return;
    }

    const pool =
      items.length > 0
        ? items.map((i) => ({
            amountText: i.amountText || '$50',
            eventType: i.eventType,
            userName: (i as any).userName as string | undefined,
          }))
        : FALLBACK_WITHDRAWALS.map((f) => ({ ...f, userName: undefined }));

    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    const durationMs = Math.max(4500, (settings.durationSeconds || 6) * 1000);
    const baseGapMs = Math.max(1200, (settings.intervalSeconds || 6) * 1000 - durationMs);

    const scheduleNext = (delayMs: number) => {
      timerId = setTimeout(() => {
        if (cancelled) return;

        let idx = Math.floor(Math.random() * pool.length);
        if (pool.length > 1 && idx === lastIdxRef.current) {
          idx = (idx + 1) % pool.length;
        }
        lastIdxRef.current = idx;

        let nameIdx = Math.floor(Math.random() * SAMPLE_NAMES.length);
        if (SAMPLE_NAMES.length > 1 && nameIdx === lastNameIdxRef.current) {
          nameIdx = (nameIdx + 1) % SAMPLE_NAMES.length;
        }
        lastNameIdxRef.current = nameIdx;

        const chosen = pool[idx];
        const timeText = RANDOM_TIMES[Math.floor(Math.random() * RANDOM_TIMES.length)];
        keyCounterRef.current += 1;

        setActivePopup({
          key: keyCounterRef.current,
          maskedName: maskUserName(chosen.userName || SAMPLE_NAMES[nameIdx]),
          amountText: chosen.amountText,
          statusText: normalizeStatusText(chosen.eventType, keyCounterRef.current),
          timeText,
        });

        // Random realistic interval between bubbles (never cutting off mid-flight)
        const randomJitterMs = Math.floor(Math.random() * 2400) + 600;
        scheduleNext(durationMs + baseGapMs + randomJitterMs);
      }, delayMs);
    };

    // First bubble enters smoothly shortly after page load
    const initialDelay = 1200 + Math.floor(Math.random() * 1200);
    scheduleNext(initialDelay);

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [dismissedAll, settings.enabled, settings.intervalSeconds, settings.durationSeconds, items]);

  if (dismissedAll || !settings.enabled || !activePopup) return null;

  const durationSec = Math.max(4.5, settings.durationSeconds || 6);

  return (
    <div
      className={`fixed left-3 sm:left-5 ${
        hasBottomNav ? 'bottom-20 lg:bottom-6' : 'bottom-4 sm:bottom-6'
      } z-40 pointer-events-none max-w-[285px] sm:max-w-[320px]`}
      aria-live="polite"
    >
      <div
        key={activePopup.key}
        style={{ animationDuration: `${durationSec}s` }}
        className="animate-live-popup pointer-events-auto bg-white/95 backdrop-blur-md border border-orange-200/90 shadow-xl shadow-orange-950/10 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5"
      >
        <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <CheckCircle2 className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-white" />
        </div>
        <div className="min-w-0 flex-1 leading-snug">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-extrabold text-slate-900">
            <span className="font-mono tracking-tight text-slate-800">{activePopup.maskedName}</span>
            <span className="text-slate-300">•</span>
            <span className="text-orange-600 font-black tabular-nums">{activePopup.amountText}</span>
          </div>
          <div className="text-[10px] sm:text-[11px] font-bold text-emerald-700 truncate">
            {activePopup.statusText}
          </div>
          <div className="text-[9.5px] font-medium text-slate-400">
            {activePopup.timeText}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissedAll(true)}
          title="Hide live withdrawal notifications"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0 self-start"
          aria-label="Close live withdrawal notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
