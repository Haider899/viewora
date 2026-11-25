import React, { useState } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../components/ToastProvider.js';
import {
  Lock,
  Bell,
  LogOut,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

interface SettingsPageProps {
  onRequestSignOut: () => void;
}

interface NotifPrefs {
  deposits: boolean;
  withdrawals: boolean;
  videoRewards: boolean;
  referrals: boolean;
  support: boolean;
}

const PREFS_KEY = 'uads_user_notif_prefs';

function loadPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { deposits: true, withdrawals: true, videoRewards: true, referrals: true, support: true, ...JSON.parse(raw) };
  } catch {}
  return { deposits: true, withdrawals: true, videoRewards: true, referrals: true, support: true };
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: 'bg-slate-200' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-rose-500' };
  if (score === 2) return { score: 50, label: 'Fair', color: 'bg-amber-500' };
  if (score === 3) return { score: 75, label: 'Good', color: 'bg-emerald-500' };
  return { score: 100, label: 'Strong', color: 'bg-emerald-600' };
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onRequestSignOut }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwErrors, setPwErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});

  const [prefs, setPrefs] = useState<NotifPrefs>(loadPrefs);

  const strength = getPasswordStrength(newPassword);

  const togglePref = (key: keyof NotifPrefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    showToast('Notification preferences updated.', 'success');
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { current?: string; next?: string; confirm?: string } = {};
    if (!currentPassword) errs.current = 'Please enter your current password.';
    if (newPassword.length < 8) errs.next = 'New password must be at least 8 characters.';
    if (newPassword !== confirmPassword) errs.confirm = 'Passwords do not match.';

    if (Object.keys(errs).length > 0) {
      setPwErrors(errs);
      return;
    }

    setPwErrors({});
    setSavingPassword(true);
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      if (res.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('Your password has been updated.', 'success');
      } else {
        setPwErrors({ current: res.error?.message || 'Could not update password.' });
      }
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-page-in">
      {/* Security & Password */}
      <form
        onSubmit={handleUpdatePassword}
        noValidate
        className="lg:col-span-7 card-white p-6 space-y-5"
      >
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Change Password</h3>
            <p className="text-xs text-slate-500">Use at least 8 characters with numbers and letters.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Current Password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPwErrors((p) => ({ ...p, current: undefined }));
                }}
                placeholder="Enter current password"
                className={`w-full h-10 pl-3.5 pr-10 rounded-[10px] bg-slate-50 border text-sm text-slate-900 ${
                  pwErrors.current ? 'border-rose-400' : 'border-slate-200 focus:border-emerald-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Toggle current password visibility"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pwErrors.current && (
              <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {pwErrors.current}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              New Password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPwErrors((p) => ({ ...p, next: undefined }));
                }}
                placeholder="Minimum 8 characters"
                className={`w-full h-10 pl-3.5 pr-10 rounded-[10px] bg-slate-50 border text-sm text-slate-900 ${
                  pwErrors.next ? 'border-rose-400' : 'border-slate-200 focus:border-emerald-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Toggle new password visibility"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword && (
              <div className="mt-2 space-y-1">
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${strength.color}`}
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500">
                  Strength: <strong className="text-slate-800">{strength.label}</strong>
                </div>
              </div>
            )}
            {pwErrors.next && (
              <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {pwErrors.next}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Confirm New Password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPwErrors((p) => ({ ...p, confirm: undefined }));
                }}
                placeholder="Re-enter new password"
                className={`w-full h-10 pl-3.5 pr-10 rounded-[10px] bg-slate-50 border text-sm text-slate-900 ${
                  pwErrors.confirm ? 'border-rose-400' : 'border-slate-200 focus:border-emerald-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Toggle confirm password visibility"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pwErrors.confirm && (
              <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {pwErrors.confirm}
              </p>
            )}
          </div>
        </div>

        <button type="submit" disabled={savingPassword} className="btn-primary">
          <Lock className="w-4 h-4" />
          <span>{savingPassword ? 'Updating…' : 'Update Password'}</span>
        </button>
      </form>

      {/* Notification Preferences & Session */}
      <div className="lg:col-span-5 space-y-6">
        <div className="card-white p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Notification Preferences</h3>
              <p className="text-xs text-slate-500">Choose which updates highlight in your feed.</p>
            </div>
          </div>

          <div className="space-y-3">
            {([
              { key: 'deposits', label: 'Deposit verifications', desc: 'Status updates on USD deposits' },
              { key: 'withdrawals', label: 'Withdrawal payouts', desc: 'Approvals and payout references' },
              { key: 'videoRewards', label: 'Video & daily bonuses', desc: 'Automatic USD credit alerts' },
              { key: 'referrals', label: 'Referrals & rank milestones', desc: 'Commissions and rank unlocks' },
              { key: 'support', label: 'Support replies', desc: 'Messages from support specialists' },
            ] as const).map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between gap-3 py-1 cursor-pointer"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">{item.label}</div>
                  <div className="text-[11px] text-slate-500">{item.desc}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs[item.key]}
                  onClick={() => togglePref(item.key)}
                  className={`w-10 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                    prefs[item.key] ? 'bg-emerald-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                      prefs[item.key] ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            ))}
          </div>
        </div>

        <div className="card-white p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Active Session</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Signed in as <strong className="text-slate-900">{user?.email}</strong> on this browser. Signing out clears your local session token immediately.
          </p>
          <button type="button" onClick={onRequestSignOut} className="btn-destructive">
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
