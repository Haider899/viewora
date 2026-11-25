import React, { useState } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { User as UserIcon, ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  navigate: (route: string) => void;
}

export const LoginPage: React.FC<LoginProps> = ({ navigate }) => {
  const { login, logout } = useAuth();

  // Strictly lock to Admin Portal only on admin.* subdomain (or ?portal=admin for local dev)
  const isAdminPortal =
    typeof window !== 'undefined' &&
    (window.location.hostname.toLowerCase().startsWith('admin.') ||
      new URLSearchParams(window.location.search).get('portal') === 'admin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Forgot / Reset Password flow (F6)
  const [resetMode, setResetMode] = useState<'none' | 'request' | 'confirm'>('none');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [generatedCodeHint, setGeneratedCodeHint] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetErr, setResetErr] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErr(null);
    setResetMsg(null);
    setResetLoading(true);
    try {
      const res = await api.forgotPassword(resetEmail.trim());
      if (res.success) {
        setResetMsg(res.data?.message || 'Reset code generated.');
        if (res.data?.resetCode) {
          setGeneratedCodeHint(res.data.resetCode);
        }
        setResetMode('confirm');
      } else {
        setResetErr(res.error?.message || 'Unable to process request.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErr(null);
    setResetMsg(null);
    setResetLoading(true);
    try {
      const res = await api.resetPassword({
        email: resetEmail.trim(),
        token: resetCode.trim(),
        newPassword,
      });
      if (res.success) {
        setResetMsg('Password reset successfully! You can now sign in with your new password.');
        setEmail(resetEmail.trim());
        setPassword('');
        setTimeout(() => {
          setResetMode('none');
          setResetCode('');
          setNewPassword('');
          setGeneratedCodeHint(null);
        }, 1600);
      } else {
        setResetErr(res.error?.message || 'Reset failed.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const loggedInUser = await login({ email: email.trim(), password });

      const isStaffOrAdmin = [
        'SUPER_ADMIN',
        'FINANCE_ADMIN',
        'CONTENT_ADMIN',
        'SUPPORT_AGENT',
      ].includes(loggedInUser.role);

      if (isAdminPortal) {
        if (!isStaffOrAdmin) {
          logout();
          setErrorMsg(
            'Access Denied: Member accounts are not authorized to sign in through the Administrator Gateway.'
          );
          return;
        }
      } else {
        if (isStaffOrAdmin) {
          logout();
          setErrorMsg(
            'Access Denied: Please use the authorized administrative portal to sign in.'
          );
          return;
        }
      }

      navigate('home');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-md transition-all duration-200 ${
            isAdminPortal
              ? 'bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-800 shadow-slate-900/30'
              : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/20'
          }`}
        >
          {isAdminPortal ? (
            <ShieldCheck className="w-6 h-6 text-white stroke-[2.2]" />
          ) : (
            <UserIcon className="w-6 h-6 text-white stroke-[2.2]" />
          )}
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          {isAdminPortal ? 'Administrator Gateway' : 'Welcome Back'}
        </h1>
        <p className="text-xs text-slate-500">
          {isAdminPortal
            ? 'Restricted access portal for certified system managers and moderators.'
            : 'Sign in to access your video catalog, USD wallets, and referral network.'}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-7 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-5"
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {isAdminPortal ? 'Admin Email Address' : 'Email Address'}
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              placeholder={
                isAdminPortal
                  ? 'admin@innovative.online'
                  : 'user@u-ads.com'
              }
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 transition-colors"
              title={showPassword ? 'Hide password' : 'Show password'}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs shadow-sm cursor-pointer ${
            isAdminPortal
              ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
          }`}
        >
          {loading
            ? 'Authenticating...'
            : isAdminPortal
            ? 'Sign In to Admin Portal'
            : 'Sign In'}
          <ArrowRight className="w-4 h-4" />
        </button>

        {!isAdminPortal ? (
          <div className="space-y-2 pt-1 text-center text-xs text-slate-500">
            <div>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setResetErr(null);
                  setResetMsg(null);
                  setResetMode('request');
                }}
                className="text-slate-600 hover:text-emerald-700 font-semibold hover:underline cursor-pointer"
              >
                Forgot your password? Reset it here
              </button>
            </div>
            <div>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('register')}
                className="text-emerald-700 font-bold hover:underline"
              >
                Create an Account
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-[11px] text-slate-400 pt-1 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Authorized administrators only • Audited gateway</span>
          </div>
        )}
      </form>

      {/* Self-Service Password Recovery Modal */}
      {resetMode !== 'none' && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-7 border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Password Recovery</h3>
              </div>
              <button
                type="button"
                onClick={() => setResetMode('none')}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>

            {resetMode === 'request' ? (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <p className="text-xs text-slate-500">
                  Enter your registered U-Ads email address to receive a 6-digit password reset code.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="user@u-ads.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  />
                </div>
                {resetErr && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{resetErr}</div>
                )}
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  {resetLoading ? 'Generating Code...' : 'Send 6-Digit Reset Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} className="space-y-4">
                {generatedCodeHint && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    Your 6-digit recovery code: <span className="font-mono font-black">{generatedCodeHint}</span> (valid 15 min)
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">6-Digit Reset Code</label>
                  <input
                    type="text"
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">New Password (min 8 chars)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  />
                </div>
                {resetErr && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{resetErr}</div>
                )}
                {resetMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{resetMsg}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  {resetLoading ? 'Resetting Password...' : 'Confirm New Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
