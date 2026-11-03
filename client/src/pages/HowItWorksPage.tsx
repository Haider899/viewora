import React from 'react';
import {
  UserPlus,
  CreditCard,
  Unlock,
  Play,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

interface HowItWorksProps {
  navigate: (route: string) => void;
}

export const HowItWorksPage: React.FC<HowItWorksProps> = ({ navigate }) => {
  const steps = [
    {
      step: '01',
      title: 'Create Your VistaraX Account',
      desc: 'Register with your verified email and assign your unique referral identifier. Your dual-currency wallet (USD & PKR) is instantly provisioned.',
      icon: <UserPlus className="w-6 h-6 text-emerald-600" />,
    },
    {
      step: '02',
      title: 'Fund Wallet via Verified Channels',
      desc: 'Submit a deposit request through EasyPaisa, JazzCash, or USDT (TRC-20). Authorized finance administrators verify authentic payment references before posting atomic ledger credits.',
      icon: <CreditCard className="w-6 h-6 text-teal-600" />,
    },
    {
      step: '03',
      title: 'Select & Unlock Your Package Tier',
      desc: 'Choose from Starter ($20), Basic ($50), Premium ($100), or VIP ($500). Your purchase is executed via your wallet balance with historical terms snapshot preservation.',
      icon: <Unlock className="w-6 h-6 text-purple-600" />,
    },
    {
      step: '04',
      title: 'Stream Verified Masterclasses',
      desc: 'Watch high-definition masterclasses through our embedded player. Cryptographic session nonces and real-time heartbeats validate active engagement without client tampering.',
      icon: <Play className="w-6 h-6 text-emerald-600" />,
    },
    {
      step: '05',
      title: 'Audit Transactions & Settle Payouts',
      desc: 'Track every transaction in your immutable double-entry ledger. Request withdrawals with immediate balance holds and transparent payment references.',
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest">
          Platform Architecture
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900">How VistaraX Works</h1>
        <p className="text-slate-600 text-sm leading-relaxed">
          A step-by-step walkthrough of our verification pipeline, double-entry financial ledger, and video access control system.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {steps.map((s, idx) => (
          <div
            key={idx}
            className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs card-hover flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-200">
                  {s.icon}
                </div>
                <span className="text-3xl font-black text-slate-300 font-mono">
                  {s.step}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{s.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-8 sm:p-10 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-xl font-bold text-slate-900">Ready to begin your learning journey?</h4>
          <p className="text-xs text-slate-500">
            Sign up now and explore our comprehensive masterclass catalog.
          </p>
        </div>
        <button
          onClick={() => navigate('register')}
          className="px-6 py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-2 text-xs shadow-sm shadow-emerald-600/20"
        >
          Get Started Now
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
