import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../components/ToastProvider.js';
import {
  formatAccountLevelLabel,
  formatDate,
  formatUSD,
  getAccountLevelProgress,
  getInitials,
} from '../utils/formatters.js';
import {
  Copy,
  Check,
  Award,
  ShieldCheck,
  Save,
  AlertCircle,
  CheckCircle2,
  Settings,
  Users,
} from 'lucide-react';

interface ProfilePageProps {
  navigate: (route: string) => void;
  referralRank?: string;
  qualifiedReferrals?: number;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  navigate,
  referralRank = 'New',
  qualifiedReferrals = 0,
}) => {
  const { user, wallet, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'id' | 'ref' | null>(null);

  useEffect(() => {
    setFullName(user?.fullName || '');
    setPhone(user?.phone || '');
  }, [user?.fullName, user?.phone]);

  // Issue #6: Single authoritative server-calculated Level Progress (same across Sidebar, Dashboard & Profile)
  const lp = user?.levelProgress;
  const levelInfo = lp
    ? {
        currentLabel: lp.currentLevelName,
        nextLabel: lp.nextLevelName,
        percent: lp.progressPercent,
        neededCents: lp.neededCents,
      }
    : getAccountLevelProgress(user?.accountLevel, 0);

  const copyText = (value: string, field: 'id' | 'ref', label: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    showToast(`${label} copied to clipboard.`, 'success');
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    if (fullName.trim().length < 2) {
      setNameError('Please enter your full name (at least 2 characters).');
      return;
    }
    setSaving(true);
    try {
      const res = await api.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
      });
      if (res.success) {
        await refreshUser();
        showToast('Profile details saved.', 'success');
      } else {
        showToast(res.error?.message || 'Could not update profile.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-page-in">
      {/* Identity Overview Header */}
      <div className="card-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white font-extrabold text-lg flex items-center justify-center shrink-0">
            {getInitials(user?.fullName)}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-900">{user?.fullName}</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                {(user as any)?.isAccountLocked ? 'Account Locked' : 'Active'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {user?.email} · Member since {formatDate(user?.createdAt)}
            </p>
          </div>
        </div>

        <button type="button" onClick={() => navigate('settings')} className="btn-secondary">
          <Settings className="w-4 h-4" />
          <span>Password &amp; Settings</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Edit Personal Details */}
        <form onSubmit={handleSave} noValidate className="lg:col-span-7 card-white p-6 space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Personal Information</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Keep your display name and contact phone up to date.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Full Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setNameError(null);
                }}
                placeholder="Enter your full name"
                className={`w-full h-10 px-3.5 rounded-[10px] bg-slate-50 border text-sm text-slate-900 ${
                  nameError ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-emerald-500'
                }`}
              />
              {nameError && (
                <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {nameError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full h-10 px-3.5 rounded-[10px] bg-slate-100 border border-slate-200 text-sm text-slate-500 cursor-not-allowed"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Contact support if you ever need to update your registered email.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional contact phone"
                className="w-full h-10 px-3.5 rounded-[10px] bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving…' : 'Save Changes'}</span>
            </button>
          </div>
        </form>

        {/* Member ID, Level & Rank Status */}
        <div className="lg:col-span-5 space-y-6">
          <div className="card-white p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Account Identifiers</h3>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Member ID</div>
                  <div className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                    {user?.memberCode || '—'}
                  </div>
                </div>
                {user?.memberCode && (
                  <button
                    type="button"
                    onClick={() => copyText(user.memberCode!, 'id', 'Member ID')}
                    className="btn-secondary !h-8 !px-3"
                  >
                    {copiedField === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'id' ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Referral Code</div>
                  <div className="text-sm font-mono font-bold text-emerald-700 mt-0.5">
                    {user?.referralCode || '—'}
                  </div>
                </div>
                {user?.referralCode && (
                  <button
                    type="button"
                    onClick={() => copyText(user.referralCode!, 'ref', 'Referral code')}
                    className="btn-secondary !h-8 !px-3"
                  >
                    {copiedField === 'ref' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'ref' ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Level & Rank Progression */}
          <div className="card-white p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Level &amp; Rank Standing</h3>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Account Level: {formatAccountLevelLabel(user?.accountLevel)}</span>
                </div>
                <span className="text-xs font-bold text-emerald-700 tabular-nums">{levelInfo.percent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${levelInfo.percent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {levelInfo.nextLabel
                  ? `${formatUSD(levelInfo.neededCents)} in qualifying balance toward ${levelInfo.nextLabel}.`
                  : 'You have reached the highest account level.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="text-xs font-bold text-slate-900">Referral Rank: {referralRank}</div>
                  <div className="text-[11px] text-slate-500">
                    {qualifiedReferrals} qualified referral{qualifiedReferrals === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('referrals')}
                className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                View Ladder
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Your USD balances are protected by double-entry ledger auditing.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
