import React, { useState } from 'react';
import {
  Play,
  ShieldCheck,
  Zap,
  TrendingUp,
  Layers,
  ChevronRight,
  CheckCircle2,
  Lock,
  ArrowRight,
  HelpCircle,
  Video,
  Award,
  Globe,
  Sparkles,
} from 'lucide-react';

interface HomePageProps {
  navigate: (route: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'What is VistaraX?',
      a: 'VistaraX is an enterprise-grade digital educational media platform offering up to 60 specialized masterclasses across AI, software engineering, quantitative finance, cybersecurity, and strategic management.',
    },
    {
      q: 'How does the dual-currency wallet function?',
      a: 'VistaraX maintains separate, mathematically isolated ledger accounts for USD and PKR. All transactions are recorded through an immutable double-entry ledger where every debit strictly balances against an equal credit, preventing any financial or precision drift.',
    },
    {
      q: 'How are manual payments (EasyPaisa / JazzCash / USDT) verified?',
      a: 'When you submit a deposit request, it is queued for review by our certified Finance Administration team. Staff inspect authentic banking or blockchain transaction receipts before authorizing an atomic ledger credit to your wallet.',
    },
    {
      q: 'Are returns or daily yields guaranteed?',
      a: 'No. VistaraX is an educational streaming platform and is NOT an investment fund, HYIP, or deposit-return scheme. All viewing rewards and referral commissions are strictly contingent upon verified engagement and approved net-revenue events.',
    },
    {
      q: 'How do referral commissions work?',
      a: 'Commissions are calculated solely on verified, eligible package purchases made by your invited referrals. Commissions are never generated on deposit transfers or arbitrary account balance top-ups.',
    },
  ];

  return (
    <div className="space-y-20 pb-20 bg-slate-50">
      {/* Hero Section */}
      <section className="relative pt-16 md:pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Soft background radial highlight */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-emerald-100/60 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-6 shadow-2xs">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>VistaraX 2.0 • Media Access & Audited Ledger Engine</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.1]">
          Master High-Value Skills with{' '}
          <span className="text-emerald-600">Enterprise-Grade</span> Integrity.
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Access an exclusive library of 60 premium masterclasses. Powered by server-verified telemetry sessions, dual-currency wallets, and an immutable double-entry ledger.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => navigate('videos')}
            className="px-8 py-3.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/20 hover:scale-[1.02] flex items-center gap-2 text-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            Explore Video Catalog
          </button>
          <button
            onClick={() => navigate('packages')}
            className="px-8 py-3.5 rounded-xl font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 transition-all hover:scale-[1.02] flex items-center gap-2 text-sm shadow-2xs"
          >
            View Access Packages
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Highlight Stats Strip */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs text-left">
            <div className="text-3xl font-extrabold text-slate-900">60</div>
            <div className="text-xs font-bold text-emerald-600 mt-1 uppercase tracking-wider">
              Masterclasses
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Curated HD modules</div>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs text-left">
            <div className="text-3xl font-extrabold text-slate-900">100%</div>
            <div className="text-xs font-bold text-teal-600 mt-1 uppercase tracking-wider">
              Double-Entry
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Balanced mathematical ledger</div>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs text-left">
            <div className="text-3xl font-extrabold text-slate-900">USD / PKR</div>
            <div className="text-xs font-bold text-blue-600 mt-1 uppercase tracking-wider">
              Dual-Currency
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Dedicated wallet accounts</div>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs text-left">
            <div className="text-3xl font-extrabold text-slate-900">5 Roles</div>
            <div className="text-xs font-bold text-purple-600 mt-1 uppercase tracking-wider">
              RBAC Security
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Strict operational separation</div>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-2">
            Enterprise Architecture
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            Built from the ground up for transparency, security, and scalability.
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-white border border-slate-200/90 shadow-xs card-hover space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Video className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Telemetry Session Verification</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Video sessions employ cryptographic nonces and time-windowed heartbeats. Client completion claims are verified against wall-clock telemetry to eliminate manipulation.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white border border-slate-200/90 shadow-xs card-hover space-y-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Zero-Drift Double-Entry Ledger</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every balance update is computed through immutable debit-credit pairs. Monetary amounts are stored in minor currency units to eliminate floating-point rounding errors.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white border border-slate-200/90 shadow-xs card-hover space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Traceable Net-Revenue Referrals</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Referral commissions require explicit lineage to confirmed package purchases. Self-referrals and circular chains are mathematically blocked.
            </p>
          </div>
        </div>
      </section>

      {/* Package Teaser Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-10 rounded-3xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl space-y-4">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
              Configurable Access Tiers
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900">
              Choose the learning package matched to your trajectory.
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              From our Starter Tier (2 masterclasses for $20) to our VIP Tier (unrestricted access to all 60 videos for $500), unlock immediate access with flexible payment methods.
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate('packages')}
                className="px-6 py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm flex items-center gap-2 text-xs"
              >
                Compare All 4 Packages
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-2">
            Questions & Answers
          </h2>
          <h3 className="text-3xl font-extrabold text-slate-900">Frequently Asked Questions</h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden transition-colors"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left px-6 py-4 flex items-center justify-between text-slate-900 font-bold text-sm hover:text-emerald-700"
              >
                <span>{faq.q}</span>
                <ChevronRight
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    openFaq === idx ? 'rotate-90 text-emerald-600' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-6 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
