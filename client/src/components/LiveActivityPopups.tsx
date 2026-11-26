import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api.js';
import { LiveActivityPopupItem } from '../types/index.js';
import { CheckCircle2, X, Sparkles } from 'lucide-react';

export const LiveActivityPopups: React.FC = () => {
  const [items, setItems] = useState<LiveActivityPopupItem[]>([]);
  const [settings, setSettings] = useState({ enabled: true, intervalSeconds: 6, durationSeconds: 5 });
  const [dismissedAll, setDismissedAll] = useState(false);
  const [activePopup, setActivePopup] = useState<{ item: LiveActivityPopupItem; key: number } | null>(null);
  const lastIdxRef = useRef<number>(-1);
  const keyCounterRef = useRef<number>(1);

  useEffect(() => {
    let mounted = true;
    api
      .getLivePopups()
      .then((res) => {
        if (!mounted || !res.success || !res.data) return;
        setSettings(res.data.settings || { enabled: true, intervalSeconds: 6, durationSeconds: 5 });
        setItems(Array.isArray(res.data.items) ? res.data.items.filter((i: any) => i.isActive) : []);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (dismissedAll || !settings.enabled || items.length === 0) {
      setActivePopup(null);
      return;
    }

    const pickNext = () => {
      let idx = Math.floor(Math.random() * items.length);
      if (items.length > 1 && idx === lastIdxRef.current) {
        idx = (idx + 1) % items.length;
      }
      lastIdxRef.current = idx;
      keyCounterRef.current += 1;
      setActivePopup({ item: items[idx], key: keyCounterRef.current });
    };

    const initialTimer = setTimeout(pickNext, 1800);
    const intervalMs = Math.max(2500, (settings.intervalSeconds || 6) * 1000);
    const loop = setInterval(pickNext, intervalMs);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(loop);
    };
  }, [dismissedAll, settings.enabled, settings.intervalSeconds, items]);

  if (dismissedAll || !settings.enabled || !activePopup) return null;

  const durationSec = Math.max(3, settings.durationSeconds || 5);

  return (
    <div
      className="fixed left-3 sm:left-5 bottom-20 lg:bottom-6 z-40 pointer-events-none max-w-[290px] sm:max-w-[320px]"
      aria-live="polite"
    >
      <div
        key={activePopup.key}
        style={{ animationDuration: `${durationSec}s` }}
        className="animate-live-popup pointer-events-auto bg-white/95 backdrop-blur-md border border-orange-200/90 shadow-lg shadow-orange-950/10 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
          {activePopup.item.eventType.toLowerCase().includes('withdraw') ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[11px] font-extrabold text-slate-900 truncate">
            {activePopup.item.eventType}{' '}
            <span className="text-orange-600 tabular-nums">— {activePopup.item.amountText}</span>
          </div>
          <div className="text-[10px] font-medium text-slate-500 mt-0.5">
            {activePopup.item.timeText}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissedAll(true)}
          title="Hide live activity popups"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
          aria-label="Close live activity popup"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
