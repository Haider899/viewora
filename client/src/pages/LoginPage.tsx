import React, { useState } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../components/ToastProvider.js';
import {
  User as UserIcon,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  X,
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

  // Forgot / Reset Password flow
  const [resetMode, setResetMode] = useState<'none' | 'request' | 'confirm'>('none');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [generatedCodeHint, setGeneratedCodeHint] = useState<string | null>(null);
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
        setResetMsg(res.data?.message || 'Recovery code generated.');
        if (res.data?.resetCode) setGeneratedCodeHint(res.data.resetCode);
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
      setResetErr('Enter the 6-digit reset code.');
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
          setGeneratedCodeHint(null);
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

  return (
    <div className="max-w-md mx-auto px-4 py-14 space-y-6 animate-page-in">
      <div className="text-center space-y-2">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-md ${
            isAdminPortal ? 'bg-slate-900' : 'bg-emerald-600'
          }`}
        >
          {isAdminPortal ? (
            <ShieldCheck className="w-6 h-6 text-white" />
          ) : (
            <UserIcon className="w-6 h-6 text-white" />
          )}
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          {isAdminPortal ? 'Administrator Sign In' : 'Sign in to U-Ads'}
        </h1>
        <p className="text-xs text-slate-500">
          {isAdminPortal
            ? 'Authorized staff and operations access.'
            : 'Manage your USD wallets, watch verified campaigns, and track referrals.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="card-white p-6 sm:p-7 space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Email Address <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldErrors((f) => ({ ...f, email: undefined }));
              }}
              className={`w-full h-11 bg-slate-50 border rounded-[10px] pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 ${
                fieldErrors.email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-emerald-500'
              }`}
            />
          </div>
          {fieldErrors.email && (
            <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700">
              Password <span className="text-rose-600">*</span>
            </label>
            {!isAdminPortal && (
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setResetErr(null);
                  setResetMsg(null);
                  setResetMode('request');
                }}
                className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            )}
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((f) => ({ ...f, password: undefined }));
              }}
              className={`w-full h-11 bg-slate-50 border rounded-[10px] pl-10 pr-10 text-xs text-slate-900 placeholder-slate-400 ${
                fieldErrors.password ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-emerald-500'
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
            <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {fieldErrors.password}
            </p>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full !h-11">
          <span>{loading ? 'Signing in…' : isAdminPortal ? 'Sign In to Admin Portal' : 'Sign In'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {!isAdminPortal && (
          <div className="text-center text-xs text-slate-500 pt-1">
            New to U-Ads?{' '}
            <button
              type="button"
              onClick={() => navigate('register')}
              className="text-emerald-700 font-bold hover:underline cursor-pointer"
            >
              Create an account
            </button>
          </div>
        )}
      </form>

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
              <KeyRound className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">Reset Your Password</h3>
            </div>

            {resetMode === 'request' ? (
              <form onSubmit={handleRequestReset} noValidate className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter your registered email address to generate a 6-digit recovery code.
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
                    className="w-full h-10 px-3.5 rounded-[10px] bg-slate-50 border border-slate-200 text-xs focus:border-emerald-500"
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
                {generatedCodeHint && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    Recovery code: <span className="font-mono font-black">{generatedCodeHint}</span> (valid 15 min)
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    6-Digit Code <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full h-10 px-3.5 rounded-[10px] bg-slate-50 border border-slate-200 text-xs font-mono font-bold focus:border-emerald-500"
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
                      className="w-full h-10 pl-3.5 pr-10 rounded-[10px] bg-slate-50 border border-slate-200 text-xs focus:border-emerald-500"
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
