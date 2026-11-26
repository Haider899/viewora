import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { CompanyDocument, LandingContent, Package, Video as VideoItem } from '../types/index.js';
import {
  Play,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Video,
  Award,
  Sparkles,
  FileText,
  X,
  Eye,
  Mail,
  Phone,
  Clock,
  Users,
  MessageSquare,
  Check,
} from 'lucide-react';

interface HomePageProps {
  navigate: (route: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<CompanyDocument | null>(null);
  const [previewVideos, setPreviewVideos] = useState<VideoItem[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [content, setContent] = useState<LandingContent>({});

  useEffect(() => {
    Promise.allSettled([
      api.getPublicDocuments(),
      api.getLandingContent(),
      api.getVideos(),
      api.getPackages(),
    ]).then(([docsRes, cmsRes, vidsRes, pkgRes]) => {
      if (docsRes.status === 'fulfilled' && docsRes.value.success && docsRes.value.data) {
        setDocuments(docsRes.value.data);
      }
      if (cmsRes.status === 'fulfilled' && cmsRes.value.success && cmsRes.value.data) {
        setContent(cmsRes.value.data);
      }
      if (vidsRes.status === 'fulfilled' && vidsRes.value.success && Array.isArray(vidsRes.value.data)) {
        setPreviewVideos(vidsRes.value.data.slice(0, 3));
      }
      if (pkgRes.status === 'fulfilled' && pkgRes.value.success && Array.isArray(pkgRes.value.data)) {
        setPackages(pkgRes.value.data);
      }
    });
  }, []);

  const faqs = [
    {
      q: 'What is U-Ads?',
      a: 'U-Ads is a USD-based digital video engagement and rewards platform where members unlock curated video campaigns, earn verified full-watch video rewards, advance through Account Levels, and earn tiered referral commissions.',
    },
    {
      q: 'How do U-Ads USD wallets work?',
      a: 'Every U-Ads account operates strictly in USD with separated, double-entry ledger wallets: Main Account Credits (for deposits and packages), Video Rewards Wallet (for automatic full-watch video credits), and Referral Wallet (for affiliate commissions & milestones).',
    },
    {
      q: 'How long does deposit verification take?',
      a: 'Deposits submitted via USDT (TRC-20) or USD International Bank Wire are reviewed by our Finance Administration desk and typically verified within 10–30 minutes once a valid transaction reference and receipt are submitted.',
    },
    {
      q: 'How do video rewards get credited?',
      a: 'Watch any unlocked video from start to finish without pausing or skipping. Upon 100% completion, the platform automatically verifies your session telemetry and credits your USD Video Rewards Wallet with no manual claim required.',
    },
    {
      q: 'How do referral commissions and ranks work?',
      a: 'You earn tiered USD commissions (scaling from 5% up to 15% by position) on each invited member’s first qualifying USD package transaction, plus automatic rank milestone cash rewards credited to your Referral Wallet.',
    },
  ];

  return (
    <div className="space-y-20 pb-20 bg-slate-50">
      {/* Optional Admin Announcement Banner */}
      {content.announcementEnabled && content.announcementBanner && (
        <div className="bg-emerald-700 text-white text-center py-2.5 px-4 text-xs font-semibold">
          {content.announcementBanner}
        </div>
      )}

      {/* Hero Section */}
      <section className="relative pt-14 md:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-emerald-100/60 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-6 shadow-2xs">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>{content.badgeText || 'U-Ads • Verified Video Campaigns & USD Ledger Engine'}</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.12]">
          {(() => {
            const rawTitle = (content.heroTitle || '').trim();
            const rawHighlight = (content.heroHighlight || '').trim();
            // Guard against clipped CMS headlines ending in "&" with no highlight
            if (rawTitle && rawTitle.endsWith('&') && !rawHighlight) {
              return (
                <>
                  {rawTitle}{' '}
                  <span className="text-emerald-600">Earn Real USD Rewards</span>
                </>
              );
            }
            if (rawTitle) {
              return (
                <>
                  {rawTitle}{' '}
                  {rawHighlight && <span className="text-emerald-600">{rawHighlight}</span>}
                </>
              );
            }
            return (
              <>
                Watch Verified Campaigns &amp;{' '}
                <span className="text-emerald-600">Earn Real USD Rewards</span>
              </>
            );
          })()}
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          {content.heroSubtitle ||
            'Join U-Ads for verified full-duration video campaigns, isolated USD wallets, Account Level bonuses, and tiered referral rewards backed by an audited double-entry ledger.'}
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => navigate('register')}
            className="px-8 py-3.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/20 hover:scale-[1.02] flex items-center gap-2 text-sm cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            {content.heroCtaText || 'Create Free U-Ads Account'}
          </button>
          <button
            onClick={() => navigate('packages')}
            className="px-8 py-3.5 rounded-xl font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 transition-all hover:scale-[1.02] flex items-center gap-2 text-sm shadow-2xs cursor-pointer"
          >
            View USD Packages
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Highlight Stats Strip */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs text-left">
            <div className="text-3xl font-extrabold text-slate-900">USD Only</div>
            <div className="text-xs font-bold text-emerald-600 mt-1 uppercase tracking-wider">
              Unified Currency
            </div>
            <div className="text-xs text-slate-500 mt-0.5">USDT TRC-20 &amp; Bank Wire</div>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs text-left">
            <div className="text-3xl font-extrabold text-slate-900">10–30 min</div>
            <div className="text-xs font-bold text-teal-600 mt-1 uppercase tracking-wider">
              Fast Verification
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Audited deposit processing</div>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs text-left">
            <div className="text-3xl font-extrabold text-slate-900">3 Wallets</div>
            <div className="text-xs font-bold text-indigo-600 mt-1 uppercase tracking-wider">
              Double-Entry Ledger
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Main, Video &amp; Referral USD</div>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs text-left">
            <div className="text-3xl font-extrabold text-slate-900">5% – 15%</div>
            <div className="text-xs font-bold text-purple-600 mt-1 uppercase tracking-wider">
              Referral Tiers
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Plus milestone USD bonuses</div>
          </div>
        </div>
      </section>

      {/* Video Preview Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
              Video Preview
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-1">
              {content.videoPreviewHeading || 'Featured Video Campaigns'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              {content.videoPreviewSubtitle ||
                'Preview active campaigns in the U-Ads catalog. Sign in to watch full durations and earn automatic USD credits.'}
            </p>
          </div>
          <button
            onClick={() => navigate('videos')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
          >
            Browse Full Catalog
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {previewVideos.length > 0 ? (
            previewVideos.map((vid) => (
              <div
                key={vid.id}
                className="rounded-3xl bg-white border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="relative aspect-video bg-slate-900">
                  <img
                    src={vid.thumbnailUrl}
                    alt={vid.title}
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-md bg-white/95 text-slate-900 text-[10px] font-bold">
                    {vid.minPackageTier} Tier
                  </div>
                  {vid.rewardEligible && (
                    <div className="absolute bottom-3 right-3 px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                      +${(vid.rewardAmountCents / 100).toFixed(2)} USD
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-2">
                  <div className="text-[10px] font-bold uppercase text-emerald-700">{vid.category}</div>
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{vid.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{vid.description}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="md:col-span-3 p-10 rounded-3xl bg-white border border-slate-200 text-center text-xs text-slate-500">
              Sign in to explore curated U-Ads video campaigns and start earning USD rewards.
            </div>
          )}
        </div>
      </section>

      {/* Rewards Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-2">
            Rewards Ecosystem
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            {content.rewardsHeading || content.rewardsTitle || 'Three Transparent Ways to Earn USD on U-Ads'}
          </h3>
          {content.rewardsSubtitle && (
            <p className="text-xs text-slate-500 mt-2">{content.rewardsSubtitle}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-white border border-slate-200/90 shadow-xs card-hover space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Video className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Automatic Video Watch Rewards</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Complete full-duration verified video campaigns without skipping. Rewards credit automatically to your dedicated Video Rewards Wallet.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white border border-slate-200/90 shadow-xs card-hover space-y-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
              <Award className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Account Level Progression</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Advance through Level 1 to Level 5 based on qualifying USD activity to unlock expanded video limits and eligible daily level bonuses.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white border border-slate-200/90 shadow-xs card-hover space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Tiered Referrals &amp; Milestones</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Earn 5% to 15% USD commission on each invited member&apos;s first qualifying package, plus automatic rank milestone rewards in your Referral Wallet.
            </p>
          </div>
        </div>
      </section>

      {/* Live Available Plans Section (All 4 USD Packages — F14) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
            Available USD Plans
          </span>
          <h3 className="text-3xl font-extrabold text-slate-900">
            {content.packagesTitle || 'Choose the USD package matched to your goals.'}
          </h3>
          <p className="text-slate-600 text-xs leading-relaxed">
            {content.packagesSubtitle ||
              (packages.length > 0
                ? `Transparent lifetime USD tiers — ${packages
                    .map((p) => `${p.name} ($${(p.priceCents / 100).toFixed(0)})`)
                    .join(', ')} — synced live with your Member Portal.`
                : 'Transparent lifetime USD tiers synced live with your Member Portal.')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {packages.map((pkg) => {
            const adsCount = pkg.unlockedAdsCount ?? pkg.videoLimit;
            const perAdUSD = ((pkg.perVideoRewardCents ?? 50) / 100).toFixed(2);
            const refRange = pkg.referralRateRange || '5%–15%';
            const isRecommended = pkg.name === 'Premium';
            return (
              <div
                key={pkg.id}
                className={`p-6 rounded-2xl bg-white border flex flex-col justify-between space-y-5 relative transition-all card-hover ${
                  isRecommended
                    ? 'border-2 border-orange-500 ring-4 ring-orange-500/10 shadow-md'
                    : 'border-slate-200/90 shadow-xs'
                }`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs">
                    Recommended
                  </div>
                )}
                <div className="space-y-3">
                  <h4 className="text-lg font-extrabold text-slate-900">{pkg.name}</h4>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900 tabular-nums">
                      ${(pkg.priceCents / 100).toFixed(0)}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">USD · Lifetime</span>
                  </div>
                  <div className="text-xs font-bold text-slate-700 bg-orange-50/70 border border-orange-200 rounded-xl px-3 py-1.5">
                    Unlocks {adsCount} Daily Ad{adsCount === 1 ? '' : 's'}
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    <li className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                      <span>Earn ${perAdUSD} USD per ad watched</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                      <span>Lifetime subscription · Pay difference to upgrade</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                      <span>{refRange} Referral Commission eligibility</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => navigate('packages')}
                  className={isRecommended ? 'btn-primary w-full' : 'btn-secondary w-full'}
                >
                  Select {pkg.name}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-2">
            Questions &amp; Answers
          </h2>
          <h3 className="text-3xl font-extrabold text-slate-900">
            {content.faqTitle || 'Frequently Asked Questions'}
          </h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden transition-colors"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left px-6 py-4 flex items-center justify-between text-slate-900 font-bold text-sm hover:text-emerald-700 cursor-pointer"
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

      {/* Verified Corporate Documents & Licenses */}
      {documents.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Transparency &amp; Governance
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900">
              Company Credentials &amp; Regulatory Licenses
            </h3>
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
                      {doc.description || 'Official verified U-Ads platform document.'}
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
      )}

      {/* Contact & Customer Support Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 text-white shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
              24/7 Customer Support
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold">
              {content.contactHeading || 'Need assistance with deposits, packages, or your account?'}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              {content.contactSubtitle ||
                'Our U-Ads AI Assistant and dedicated human Support Specialists are available to help with USD deposit verification, withdrawals, and account level upgrades.'}
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={() => navigate('login')}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                Sign In for Live Support Chat
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-1 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <Mail className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-bold">Support Email</div>
                <div className="font-semibold text-white">{content.contactEmail || 'support@u-ads.com'}</div>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <Phone className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-bold">Support Desk</div>
                <div className="font-semibold text-white">{content.contactPhone || '+1 (800) 555-0199'}</div>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <Clock className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-bold">Verification &amp; Hours</div>
                <div className="font-semibold text-white">
                  {content.contactHours || '24/7 Live Desk • Deposits verified in 10–30 min'}
                </div>
              </div>
            </div>
          </div>
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
              {selectedDoc.fileUrl?.startsWith('data:application/pdf') ||
              selectedDoc.fileUrl?.toLowerCase().includes('.pdf') ? (
                <iframe
                  src={selectedDoc.fileUrl}
                  title={selectedDoc.title}
                  className="w-full h-[450px] rounded-xl border-0"
                />
              ) : (
                <img
                  src={selectedDoc.fileUrl}
                  alt={selectedDoc.title}
                  className="max-h-[380px] w-full object-cover rounded-xl"
                />
              )}
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
