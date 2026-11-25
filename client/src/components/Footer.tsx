import React from 'react';
import { PlaySquare, Lock, Mail, Clock, MessageCircle } from 'lucide-react';

interface FooterProps {
  navigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-500 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 4-column structure: Brand · Platform · Legal · Support (§6) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-200/80">
          {/* 1. Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-xs">
                <PlaySquare className="w-4 h-4 text-white stroke-[2.3]" />
              </div>
              <span className="text-lg font-extrabold text-slate-900 tracking-tight">
                U-<span className="text-emerald-600">Ads</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Verified video engagement campaigns and transparent USD wallets powered by a double-entry ledger.
            </p>
          </div>

          {/* 2. Platform */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => navigate('how-it-works')} className="hover:text-emerald-700 transition-colors cursor-pointer">
                  How It Works
                </button>
              </li>
              <li>
                <button onClick={() => navigate('videos')} className="hover:text-emerald-700 transition-colors cursor-pointer">
                  Videos
                </button>
              </li>
              <li>
                <button onClick={() => navigate('packages')} className="hover:text-emerald-700 transition-colors cursor-pointer">
                  Packages
                </button>
              </li>
              <li>
                <button onClick={() => navigate('home')} className="hover:text-emerald-700 transition-colors cursor-pointer">
                  FAQ
                </button>
              </li>
            </ul>
          </div>

          {/* 3. Legal */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Legal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => navigate('terms')} className="hover:text-emerald-700 transition-colors cursor-pointer">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => navigate('privacy')} className="hover:text-emerald-700 transition-colors cursor-pointer">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => navigate('terms')} className="hover:text-emerald-700 transition-colors cursor-pointer">
                  Refund Policy
                </button>
              </li>
              <li>
                <button onClick={() => navigate('terms')} className="hover:text-emerald-700 transition-colors cursor-pointer">
                  Disclosures
                </button>
              </li>
            </ul>
          </div>

          {/* 4. Support */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Support
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>support@u-ads.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>24/7 Desk · Deposits verified in 10–30 min</span>
              </li>
              <li>
                <button
                  onClick={() => navigate('login')}
                  className="inline-flex items-center gap-1.5 text-emerald-700 font-bold hover:underline cursor-pointer pt-1"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Contact Live Support</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} U-Ads Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <Lock className="w-3.5 h-3.5 text-emerald-600" /> TLS Encrypted
            </span>
            <span>·</span>
            <span className="font-semibold text-slate-700">USD-only platform</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
