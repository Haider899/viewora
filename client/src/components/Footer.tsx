import React from 'react';
import { PlaySquare, Shield, Lock, FileText, CheckCircle2 } from 'lucide-react';

interface FooterProps {
  navigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-500 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-200/80">
          {/* Brand & Mission */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-sm">
                <PlaySquare className="w-4 h-4 text-white stroke-[2.5]" />
              </div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">
                Vistara<span className="text-emerald-600">X</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enterprise digital video streaming and engagement platform with immutable double-entry dual-currency ledgering.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Full Double-Entry Audited Engine</span>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => navigate('videos')} className="hover:text-emerald-600 transition-colors">
                  Masterclass Catalog
                </button>
              </li>
              <li>
                <button onClick={() => navigate('packages')} className="hover:text-emerald-600 transition-colors">
                  Tier Subscriptions
                </button>
              </li>
              <li>
                <button onClick={() => navigate('how-it-works')} className="hover:text-emerald-600 transition-colors">
                  Verification Workflow
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Legal & Disclosures
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => navigate('terms')} className="hover:text-emerald-600 transition-colors">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => navigate('privacy')} className="hover:text-emerald-600 transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => navigate('terms')} className="hover:text-emerald-600 transition-colors">
                  Refund & Cancellation Policy
                </button>
              </li>
              <li>
                <button onClick={() => navigate('terms')} className="hover:text-emerald-600 transition-colors">
                  Financial Disclosures
                </button>
              </li>
            </ul>
          </div>

          {/* Regulatory Safeguards Notice */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Compliance Notice
            </h4>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] leading-relaxed text-slate-600">
              <p className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                Educational Platform Notice
              </p>
              VistaraX operates as a digital video media service. VistaraX does not operate an investment scheme, does not solicit speculative deposits, and makes no representation of guaranteed financial yields or returns.
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} VistaraX Platform Technologies Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <Lock className="w-3.5 h-3.5 text-emerald-600" /> 256-Bit TLS Encrypted
            </span>
            <span>•</span>
            <span>EasyPaisa / JazzCash / USDT Supported</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
