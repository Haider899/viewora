import React, { useState } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../components/ToastProvider.js';
import { CompanyInfoModal } from '../components/CompanyInfoModal.js';
import {
  User as UserIcon,
  ShieldCheck,
  Lock,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  X,
  Info,
  TrendingUp,
  Globe,
} from 'lucide-react';

interface LoginProps {
  navigate: (route: string) => void;
}

export const LoginPage: React.FC<LoginProps> = ({ navigate }) => {
  const { login, logout } = useAuth();
  const { showToast } = useToast();

  const isAdminPortal =
    typeof window !== 'undefined' &&
    (window.location.hostname.toLowerCase().startsWith('admin.') ||
      new URLSearchParams(window.location.search).get('portal') === 'admin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [companyInfoOpen, setCompanyInfoOpen] = useState(false);

  // Forgot / Reset Password flow
  const [resetMode, setResetMode] = useState<'none' | 'request' | 'confirm'>('none');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetErr, setResetErr] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErr(null);
    setResetMsg(null);
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setResetErr('Please enter a valid email address.');
      return;
    }
    setResetLoading(true);
    try {
      const res = await api.forgotPassword(resetEmail.trim());
      if (res.success) {
        setResetMsg(
          res.data?.message ||
            'If an account exists for that email, a 6-digit verification code has been sent to your email address.'
        );
        setResetMode('confirm');
      } else {
        setResetErr(res.error?.message || 'Unable to process recovery request.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErr(null);
    setResetMsg(null);
    if (!resetCode.trim()) {
      setResetErr('Enter the 6-digit reset code sent to your email.');
      return;
    }
    if (newPassword.length < 8) {
      setResetErr('New password must be at least 8 characters.');
      return;
    }
    setResetLoading(true);
    try {
      const res = await api.resetPassword({
        email: resetEmail.trim(),
        token: resetCode.trim(),
        newPassword,
      });
      if (res.success) {
        setResetMsg('Password updated! You can now sign in.');
        showToast('Password reset successfully.', 'success');
        setEmail(resetEmail.trim());
        setPassword('');
        setTimeout(() => {
          setResetMode('none');
          setResetCode('');
          setNewPassword('');
        }, 1400);
      } else {
        setResetErr(res.error?.message || 'Reset failed. Check your code and try again.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const errs: { email?: string; password?: string } = {};
    if (!email.trim() || !email.includes('@')) errs.email = 'Enter a valid email address.';
    if (!password) errs.password = 'Enter your password.';
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    setLoading(true);
    try {
      const loggedInUser = await login({ email: email.trim(), password });

      const isStaffOrAdmin = [
        'SUPER_ADMIN',
        'FINANCE_ADMIN',
        'CONTENT_ADMIN',
        'SUPPORT_AGENT',
      ].includes(loggedInUser.role);

      if (isAdminPortal && !isStaffOrAdmin) {
        logout();
        setErrorMsg('Member accounts cannot sign in through the Administrator Gateway.');
        return;
      }
      if (!isAdminPortal && isStaffOrAdmin) {
        logout();
        setErrorMsg('Please use the Administrator Portal to sign in with staff credentials.');
        return;
      }

      navigate('home');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  if (isAdminPortal) {
    return (
      <div className="max-w-md mx-auto px-4 py-14 space-y-6 animate-page-in">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-6 h-6 text-orange-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Administrator Sign In</h1>
          <p className="text-xs text-slate-500">Authorized staff and operations access.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="card-white p-6 sm:p-7 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Staff Email <span className="text-rose-600">*</span>
            </label>
            <input
              type="email"
              placeholder="admin@u-ads.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-[10px] px-3.5 text-xs text-slate-900 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-[10px] pl-3.5 pr-10 text-xs text-slate-900 focus:border-orange-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{loading ? 'Signing in…' : 'Sign In to Admin Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#FFF3E6] via-[#FFF9F3] to-white pb-12 animate-page-in">
      <div className="max-w-md mx-auto px-4 pt-5 space-y-5">
        {/* Top Brand Row matching U-ADS visual design */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-sm">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">U-ADS</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-xs">
            <Globe className="w-3.5 h-3.5 text-slate-600" />
            <span>EN</span>
          </div>
        </div>

        {/* Warm Peach Hero Strip */}
        <div className="relative rounded-3xl bg-gradient-to-br from-[#FFE8D1] via-[#FFF3E6] to-[#FFEAD6] p-5 border border-orange-200/60 overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1.5 z-10">
              <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 leading-tight">
                Grow Your
                <br />
                Earnings with
                <br />
                <span className="text-orange-600">U-ADS</span>
              </h1>
              <p className="text-[11px] text-slate-600 font-medium leading-snug max-w-[180px]">
                Watch Ads, Earn Real USD &amp; Grow with Our Trusted Platform
              </p>
              <div className="w-10 h-1 rounded-full bg-orange-500 mt-1" />
            </div>

            {/* Stylized Phone & Growth Chart Graphic */}
            <div className="relative shrink-0 w-32 h-32 flex items-center justify-center">
              <div className="w-24 h-28 rounded-2xl bg-white border-[3px] border-slate-900 shadow-lg flex flex-col items-center justify-between p-2.5 rotate-2">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-[10px] font-black text-slate-900">U-ADS</span>
                </div>
                <div className="flex items-end gap-1.5 h-12 w-full justify-center pb-1">
                  <span className="w-2.5 h-4 rounded-t bg-orange-300" />
                  <span className="w-2.5 h-6 rounded-t bg-orange-400" />
                  <span className="w-2.5 h-9 rounded-t bg-orange-500" />
                  <span className="w-2.5 h-12 rounded-t bg-gradient-to-t from-orange-500 to-amber-400" />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 border-2 border-amber-100 shadow-md flex items-center justify-center text-white font-black text-base">
                $
              </div>
            </div>
          </div>
        </div>

        {/* Floating White Login Card */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-white rounded-3xl border border-orange-100 shadow-xl shadow-orange-950/5 p-6 space-y-4 -mt-3 relative z-10"
        >
          <div className="text-center space-y-1.5">
            <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200/80 text-orange-600 flex items-center justify-center mx-auto">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Welcome Back!</h2>
            <p className="text-xs text-slate-500">Login to your account to continue</p>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((f) => ({ ...f, email: undefined }));
                  }}
                  className={`w-full h-11 bg-slate-50/70 border rounded-xl pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 ${
                    fieldErrors.email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-orange-500'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((f) => ({ ...f, password: undefined }));
                  }}
                  className={`w-full h-11 bg-slate-50/70 border rounded-xl pl-10 pr-10 text-xs text-slate-900 placeholder-slate-400 ${
                    fieldErrors.password ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-orange-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {fieldErrors.password}
                </p>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full !h-12 !rounded-full !text-sm shadow-lg shadow-orange-500/25"
          >
            <span>{loading ? 'Logging in…' : 'Log In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setResetEmail(email);
                setResetErr(null);
                setResetMsg(null);
                setResetMode('request');
              }}
              className="text-slate-600 hover:text-orange-600 font-semibold cursor-pointer"
            >
              Forgot Password?
            </button>
            <div className="text-slate-500">
              New User?{' '}
              <button
                type="button"
                onClick={() => navigate('register')}
                className="text-orange-600 font-extrabold hover:underline cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          </div>
        </form>

        {/* "or" Divider + View Company Information & Licenses Button */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-bold text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={() => setCompanyInfoOpen(true)}
            className="w-full h-11 rounded-full bg-white hover:bg-orange-50 border-2 border-orange-300 text-slate-900 text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4 text-slate-900" />
            <span>View Company Information &amp; Licenses</span>
          </button>
        </div>

        {/* Bottom Soft Peach Trust Card */}
        <div className="rounded-2xl bg-[#FFF6EE] border border-orange-100 p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white border border-orange-200/80 text-orange-500 flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="border-l border-orange-200 pl-3.5 space-y-0.5">
            <div className="text-sm font-black text-slate-900">U-ADS</div>
            <p className="text-[11px] text-slate-600 leading-snug">
              A secure and reliable platform for your financial growth and success.
            </p>
          </div>
        </div>
      </div>

      {/* Company Information & Public Licenses Modal */}
      <CompanyInfoModal open={companyInfoOpen} onClose={() => setCompanyInfoOpen(false)} />

      {/* Password Recovery Modal */}
      {resetMode !== 'none' && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-5 relative animate-modal-in">
            <button
              type="button"
              onClick={() => setResetMode('none')}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 pr-8">
              <KeyRound className="w-5 h-5 text-orange-600" />
              <h3 className="text-base font-bold text-slate-900">Reset Your Password</h3>
            </div>

            {resetMode === 'request' ? (
              <form onSubmit={handleRequestReset} noValidate className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter your registered email address to receive a 6-digit recovery code.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email Address <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-10 px-3.5 rounded-[10px] bg-slate-50 border border-slate-200 text-xs focus:border-orange-500"
                  />
                </div>
                {resetErr && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{resetErr}</div>
                )}
                <div className="flex gap-2.5">
                  <button type="button" onClick={() => setResetMode('none')} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={resetLoading} className="btn-primary flex-1">
                    {resetLoading ? 'Sending…' : 'Get Reset Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} noValidate className="space-y-4">
                <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 text-xs">
                  Check your email inbox for the 6-digit recovery code (valid for 15 minutes).
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    6-Digit Code <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full h-10 px-3.5 rounded-[10px] bg-slate-50 border border-slate-200 text-xs font-mono font-bold focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    New Password <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full h-10 pl-3.5 pr-10 rounded-[10px] bg-slate-50 border border-slate-200 text-xs focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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
                <div className="flex gap-2.5">
                  <button type="button" onClick={() => setResetMode('none')} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={resetLoading} className="btn-primary flex-1">
                    {resetLoading ? 'Updating…' : 'Confirm Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
