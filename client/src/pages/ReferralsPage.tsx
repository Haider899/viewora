import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { ReferralRankProgress } from '../types/index.js';
import {
  Users,
  Copy,
  CheckCircle2,
  TrendingUp,
  Share2,
  ShieldAlert,
  Award,
  Zap,
  Target,
  Gift,
  GitBranch,
  Clock,
} from 'lucide-react';

interface ReferralsProps {
  navigate?: (route: string) => void;
}

const DEFAULT_POSITIONS = [
  { label: '1st Referral', ratePercent: 5, sub: 'Direct Rate' },
  { label: '2nd Referral', ratePercent: 7, sub: 'Tier 2 Boost' },
  { label: '3rd Referral', ratePercent: 10, sub: 'Tier 3 Boost' },
  { label: '4th Referral', ratePercent: 12, sub: 'Tier 4 Boost' },
  { label: '5th+ Referrals', ratePercent: 15, sub: 'Max Tier' },
];

export const ReferralsPage: React.FC<ReferralsProps> = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [rankProgress, setRankProgress] = useState<ReferralRankProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        const [summaryRes, rankRes] = await Promise.all([
          api.getReferralSummary(),
          api.getReferralRankProgress(),
        ]);

        if (summaryRes.success && summaryRes.data) {
          setData(summaryRes.data);
        }
        if (rankRes.success && rankRes.data) {
          setRankProgress(rankRes.data);
        }
      } catch (err) {
        console.error('Failed to load referral summary:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReferralData();
  }, []);

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const getRankBadgeStyle = (rank: string) => {
    switch (rank?.toUpperCase()) {
      case 'DIAMOND':
        return 'bg-cyan-50 text-cyan-800 border-cyan-300 ring-2 ring-cyan-400/20';
      case 'PLATINUM':
        return 'bg-purple-50 text-purple-800 border-purple-300 ring-2 ring-purple-400/20';
      case 'GOLD':
        return 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-400/20';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  // Derive dynamic commission tiers from backend referralConfig if available
  const dynamicPositions = (() => {
    const cfg = data?.referralConfig;
    if (cfg?.positionRates && Array.isArray(cfg.positionRates) && cfg.positionRates.length > 0) {
      return cfg.positionRates.map((rate: number, idx: number) => ({
        label: idx === cfg.positionRates.length - 1 ? `${idx + 1}th+ Referrals` : `${idx + 1}${idx === 0 ? 'st' : idx === 1 ? 'nd' : idx === 2 ? 'rd' : 'th'} Referral`,
        ratePercent: rate,
        sub: idx === cfg.positionRates.length - 1 ? 'Max Tier' : `Position #${idx + 1}`,
      }));
    }
    if (cfg?.positions && Array.isArray(cfg.positions) && cfg.positions.length > 0) {
      return cfg.positions.map((p: any, idx: number) => ({
        label: idx === cfg.positions.length - 1 ? `${p.level}th+ Referrals` : `Position #${p.level}`,
        ratePercent: Number(((p.rateBps ?? 500) / 100).toFixed(2)),
        sub: idx === cfg.positions.length - 1 ? 'Max Tier' : `Tier ${p.level}`,
      }));
    }
    return DEFAULT_POSITIONS;
  })();

  const progressPercent = rankProgress
    ? Math.min(100, Math.round((rankProgress.qualifiedReferrals / (rankProgress.targetQualified || 1)) * 100))
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-100">
        <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">
          U-Ads Referral & Affiliation Program
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900">Referrals, Ranks & Milestones</h2>
        <p className="text-xs text-slate-500">
          Earn tiered USD referral commissions on each invited user&apos;s first qualifying transaction, plus milestone rank rewards credited directly into your Referral Wallet.
        </p>
      </div>

      {/* Referral Rank & Milestone Progress Showcase */}
      <div className="p-7 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md space-y-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
                Current Referral Rank
              </span>
            </div>
            <div className="flex items-center gap-3">
              <h3 className="text-3xl font-black tracking-tight text-white">
                {rankProgress?.currentRank || 'New'}
              </h3>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${getRankBadgeStyle(rankProgress?.currentRank || 'New')}`}>
                ACTIVE RANK
              </span>
            </div>
          </div>

          {rankProgress?.nextRewardUSD ? (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-3">
              <Gift className="w-8 h-8 text-amber-300" />
              <div>
                <span className="text-[10px] text-indigo-200 uppercase tracking-wider block font-bold">
                  Next Milestone Cash Reward
                </span>
                <span className="text-xl font-black text-amber-300">
                  +${rankProgress.nextRewardUSD}.00 USD
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-2 relative z-10">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-indigo-200">
              Rank Milestone Progress ({rankProgress?.qualifiedReferrals || 0} / {rankProgress?.targetQualified || 5} Qualified)
            </span>
            <span className="text-amber-300 font-mono">
              {progressPercent}% Complete
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="text-[11px] text-indigo-200/80">
            {rankProgress?.remainingToNext && rankProgress.remainingToNext > 0
              ? `${rankProgress.remainingToNext} more qualified referrals needed to unlock ${rankProgress.nextRank} rank & automatic USD reward.`
              : `Maximum milestone achieved! You have qualified as a top-tier U-Ads affiliate.`}
          </p>
        </div>

        {/* Claimed Milestones */}
        {rankProgress?.milestoneClaims && rankProgress.milestoneClaims.length > 0 && (
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
              Unlocked Milestone Rewards:
            </span>
            {rankProgress.milestoneClaims.map((claim) => (
              <span
                key={claim.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {claim.rankName}: +${(claim.rewardAmountCents / 100).toFixed(2)} USD
              </span>
            ))}
          </div>
        )}
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Total Registered Members</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {loading ? '...' : data?.totalReferrals ?? 0}
          </div>
          <span className="text-[10px] text-slate-400">Direct registered peers</span>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Qualified Referrals</span>
            <Target className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-extrabold text-indigo-900">
            {loading ? '...' : data?.qualifiedReferrals ?? 0}
          </div>
          <span className="text-[10px] text-indigo-600 font-bold">Completed first qualifying USD package</span>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Total Referral Commissions</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-700">
            ${((data?.totalCommissionCents ?? 0) / 100).toFixed(2)} USD
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">Credited in Separate Referral Wallet</span>
        </div>
      </div>

      {/* Position-Based Commission Tier Schedule */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">
              Position-Based Commission Rates
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            First Qualifying Transaction Only
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Commissions scale by your direct referral position and apply strictly to each invited user&apos;s first qualifying transaction:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          {dynamicPositions.map((pos: any, idx: number) => {
            const isMax = idx === dynamicPositions.length - 1;
            return (
              <div
                key={idx}
                className={`p-3 rounded-2xl border text-center space-y-1 ${
                  isMax
                    ? 'bg-indigo-50 border-indigo-200 col-span-2 sm:col-span-1'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className={`text-[10px] uppercase font-bold ${isMax ? 'text-indigo-500' : 'text-slate-400'}`}>
                  {pos.label}
                </div>
                <div className={`text-lg font-black ${isMax ? 'text-indigo-700' : 'text-emerald-600'}`}>
                  {pos.ratePercent}%
                </div>
                <div className={`text-[10px] ${isMax ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}>
                  {pos.sub}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invitation Links & Codes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-emerald-600" />
            Your Unique Referral Code
          </h3>
          <p className="text-xs text-slate-500">
            Share this identifier with new users during their U-Ads account registration.
          </p>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-sm font-bold text-emerald-700">
            <span>{data?.referralCode || user?.referralCode || 'LOADING...'}</span>
            <button
              onClick={() => copyToClipboard(data?.referralCode || user?.referralCode || '', 'code')}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer"
              title="Copy"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          {copiedCode && <div className="text-xs text-emerald-600 font-bold">Code copied!</div>}
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-teal-600" />
            Shareable Invitation Link
          </h3>
          <p className="text-xs text-slate-500">
            Direct onboarding link with your referral code automatically embedded.
          </p>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700 truncate gap-2">
            <span className="truncate">{data?.referralLink || 'Generating link...'}</span>
            <button
              onClick={() => copyToClipboard(data?.referralLink || '', 'link')}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 shrink-0 cursor-pointer"
              title="Copy"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          {copiedLink && <div className="text-xs text-emerald-600 font-bold">Link copied!</div>}
        </div>
      </div>

      {/* Visual Referral Hierarchy Tree & Direct Lineage Network */}
      <div className="p-7 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Direct Referral Hierarchy Tree
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Visual parent-child lineage map showing direct attributed accounts, position tiers, and qualification status.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Direct Network Size</span>
            <span className="text-sm font-black text-slate-800">{data?.referrals?.length ?? 0} Members</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-6">
          {/* Root Node */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border border-indigo-500/20 max-w-md w-full justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-black text-emerald-400">
                  ROOT
                </div>
                <div>
                  <div className="text-xs font-black text-white">{user?.fullName || 'Your Account'}</div>
                  <div className="text-[10px] text-indigo-300 font-mono">Code: {data?.referralCode || user?.referralCode}</div>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRankBadgeStyle(rankProgress?.currentRank || 'New')}`}>
                {rankProgress?.currentRank || 'New'} Rank
              </span>
            </div>

            <div className="w-0.5 h-6 bg-slate-300 my-1" />
            <div className="px-3 py-1 rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Direct Level-1 Branch ({data?.referrals?.length ?? 0})
            </div>
            <div className="w-0.5 h-6 bg-slate-300 my-1" />
          </div>

          {(!data?.referrals || data.referrals.length === 0) ? (
            <div className="text-center py-8 text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 p-6">
              No direct referrals registered yet. Share your unique invitation link above to grow your referral network!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {data.referrals.map((ref: any, idx: number) => {
                const position = idx + 1;
                const posObj = dynamicPositions[Math.min(idx, dynamicPositions.length - 1)];
                const posRate = `${posObj?.ratePercent ?? 15}%`;

                return (
                  <div
                    key={ref.id || idx}
                    className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        Position #{position} ({posRate} Tier)
                      </span>
                      {ref.isQualified ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Qualified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pending Package
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-900 truncate">{ref.fullName}</div>
                      <div className="text-[11px] font-mono text-slate-400 truncate">{ref.email}</div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Joined: {new Date(ref.createdAt).toLocaleDateString()}</span>
                      <span className="font-semibold text-slate-600">Direct Level 1</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Commission Lineage Journal */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xs overflow-hidden space-y-4">
        <div className="p-6 pb-2 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Verified Commission History
          </h3>
          <span className="text-xs text-slate-400">
            Total Events: {data?.commissions?.length ?? 0}
          </span>
        </div>

        {!data?.commissions || data.commissions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No referral commissions credited yet. When your referred members complete their first qualifying USD package purchase, earned rewards will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">Source Member</th>
                  <th className="py-3 px-6">Tier Rate</th>
                  <th className="py-3 px-6">Credited Amount</th>
                  <th className="py-3 px-6 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.commissions.map((comm: any) => (
                  <tr key={comm.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">{comm.sourceUserName}</td>
                    <td className="py-4 px-6 text-emerald-700 font-bold">{comm.ratePercent}%</td>
                    <td className="py-4 px-6 font-mono font-bold text-emerald-700">
                      +${(comm.commissionCents / 100).toFixed(2)} USD
                    </td>
                    <td className="py-4 px-6 text-right text-slate-400">
                      {new Date(comm.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compliance Notice */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 text-[11px] text-slate-500 flex items-start gap-3 shadow-2xs">
        <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">U-Ads Referral Program Compliance: </span>
          Commissions are strictly awarded once per referred user on their first qualifying USD package transaction and credited to your separate USD Referral Wallet.
        </div>
      </div>
    </div>
  );
};
