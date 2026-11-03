import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { ReferralSummary } from '../types/index.js';
import {
  Users,
  Copy,
  CheckCircle2,
  TrendingUp,
  Share2,
  ShieldAlert,
  Award,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ReferralsProps {
  navigate?: (route: string) => void;
}

export const ReferralsPage: React.FC<ReferralsProps> = () => {
  const { user } = useAuth();
  const [data, setData] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        const res = await api.getReferralSummary();
        if (res.success && res.data) {
          setData(res.data);
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-100">
        <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">
          Net-Revenue Program
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900">Referrals & Commissions</h2>
        <p className="text-xs text-slate-500">
          Invite professional peers. Commissions are credited upon verified package purchases.
        </p>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Total Registered Members</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{data?.totalReferrals ?? 0}</div>
          <span className="text-[10px] text-slate-400">Joined using your invitation code</span>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Active Package Subscribers</span>
            <Award className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{data?.activeReferrals ?? 0}</div>
          <span className="text-[10px] text-slate-400">Members with an unlocked curriculum tier</span>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Total Commissions Credited</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-700">
            ${((data?.totalCommissionCents ?? 0) / 100).toFixed(2)} USD
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">Posted directly to available wallet</span>
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
            Share this identifier with new users during their account registration.
          </p>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-sm font-bold text-emerald-700">
            <span>{data?.referralCode || user?.referralCode || 'LOADING...'}</span>
            <button
              onClick={() => copyToClipboard(data?.referralCode || user?.referralCode || '', 'code')}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900"
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
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 shrink-0"
              title="Copy"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          {copiedLink && <div className="text-xs text-emerald-600 font-bold">Link copied!</div>}
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
            Total Events: {data?.commissions.length ?? 0}
          </span>
        </div>

        {data?.commissions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No referral commissions credited yet. When your referred members purchase access packages, earned rewards will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">Source Member</th>
                  <th className="py-3 px-6">Commission Rate</th>
                  <th className="py-3 px-6">Credited Amount</th>
                  <th className="py-3 px-6 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data?.commissions.map((comm) => (
                  <tr key={comm.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">{comm.sourceUserName}</td>
                    <td className="py-4 px-6 text-emerald-700 font-bold">{comm.ratePercent}%</td>
                    <td className="py-4 px-6 font-mono font-bold text-emerald-700">
                      +${(comm.commissionCents / 100).toFixed(2)} {comm.currency}
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
          <span className="font-bold text-slate-800">Referral Program Compliance: </span>
          Commissions are strictly distributed out of confirmed platform net revenue generated through package subscriptions. No commission is ever paid for recruiting or deposit transfers.
        </div>
      </div>
    </div>
  );
};
