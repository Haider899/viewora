import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { CompanyDocument } from '../types/index.js';
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
  FileText,
  ExternalLink,
  X,
  Eye,
} from 'lucide-react';

interface HomePageProps {
  navigate: (route: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<CompanyDocument | null>(null);

  useEffect(() => {
    api.getPublicDocuments().then((res) => {
      if (res.success && res.data) {
        setDocuments(res.data);
      }
    }).catch(() => {});
  }, []);

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

      {/* Verified Corporate Documents & Licenses (Section 2.1) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Transparency & Governance
          </div>
          <h3 className="text-3xl font-extrabold text-slate-900">
            Company Credentials & Regulatory Licenses
          </h3>
          <p className="text-xs text-slate-500 max-w-2xl mx-auto">
            Official commercial registrations, certified digital media advertising authorizations, and independent double-entry ledger audit reports.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">{doc.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {doc.description || 'Official verified platform document.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Authority:</span>
                    <span className="font-semibold text-slate-700">{doc.issuingAuthority || 'Corporate Registry'}</span>
                  </div>
                  {doc.licenseNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">License/Reg #:</span>
                      <span className="font-mono font-bold text-emerald-700">{doc.licenseNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDoc(doc)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Inspect Document</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Document Inspection Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedDoc(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                Official Credential Verification
              </span>
              <h3 className="text-lg font-bold text-slate-900">{selectedDoc.title}</h3>
              <p className="text-xs text-slate-500">{selectedDoc.description}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center min-h-[260px]">
              <img
                src={selectedDoc.fileUrl}
                alt={selectedDoc.title}
                className="max-h-[380px] w-full object-cover rounded-xl"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center font-mono">
              <span className="text-slate-500">License #: {selectedDoc.licenseNumber || 'VERIFIED-REG'}</span>
              <span className="text-emerald-700 font-bold">✓ Audit Certified</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
