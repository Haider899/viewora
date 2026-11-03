import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { User as UserIcon, ShieldCheck, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

interface LoginProps {
  navigate: (route: string) => void;
}

export const LoginPage: React.FC<LoginProps> = ({ navigate }) => {
  const { login, logout } = useAuth();

  // If visiting future admin subdomain (e.g. admin.innovative.online or admin.viewora...), default to ADMIN
  const isAdminSubdomain =
    typeof window !== 'undefined' &&
    window.location.hostname.toLowerCase().startsWith('admin.');

  const [portalType, setPortalType] = useState<'USER' | 'ADMIN'>(
    isAdminSubdomain ? 'ADMIN' : 'USER'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePortalSwitch = (type: 'USER' | 'ADMIN') => {
    setPortalType(type);
    setErrorMsg(null);
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

      if (portalType === 'ADMIN') {
        if (!isStaffOrAdmin) {
          logout();
          setErrorMsg(
            'Access Denied: Member accounts are not authorized to sign in through the Admin Portal. Please switch to User / Member.'
          );
          return;
        }
      } else {
        if (isStaffOrAdmin) {
          logout();
          setErrorMsg(
            'Administrative account detected. Please select the "Admin Portal" box above to sign in.'
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
            portalType === 'ADMIN'
              ? 'bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-800 shadow-slate-900/30'
              : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/20'
          }`}
        >
          {portalType === 'ADMIN' ? (
            <ShieldCheck className="w-6 h-6 text-white stroke-[2.2]" />
          ) : (
            <UserIcon className="w-6 h-6 text-white stroke-[2.2]" />
          )}
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          {portalType === 'ADMIN' ? 'Administrator Gateway' : 'Welcome Back'}
        </h1>
        <p className="text-xs text-slate-500">
          {portalType === 'ADMIN'
            ? 'Restricted access portal for certified system managers and moderators.'
            : 'Sign in to access your video catalog, dual-currency wallet, and referral network.'}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-7 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-5"
      >
        {/* Role Selector Box (User vs Admin) */}
        <div>
          <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
            Select Portal Access
          </label>
          <div className="grid grid-cols-2 gap-2.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80">
            {/* User Account Box */}
            <button
              type="button"
              onClick={() => handlePortalSwitch('USER')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                portalType === 'USER'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80 ring-1 ring-emerald-500/20'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <UserIcon
                className={`w-4 h-4 ${
                  portalType === 'USER' ? 'text-emerald-600' : 'text-slate-400'
                }`}
              />
              <span>User / Member</span>
            </button>

            {/* Admin Account Box */}
            <button
              type="button"
              onClick={() => handlePortalSwitch('ADMIN')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                portalType === 'ADMIN'
                  ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <ShieldCheck
                className={`w-4 h-4 ${
                  portalType === 'ADMIN' ? 'text-indigo-400' : 'text-slate-400'
                }`}
              />
              <span>Admin Portal</span>
            </button>
          </div>
        </div>

        {/* Future Subdomain Indicator Banner */}
        {portalType === 'ADMIN' && (
          <div className="p-3 rounded-xl bg-slate-900/5 border border-slate-900/10 text-[11px] text-slate-600 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5 text-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              Administrative Verification
            </span>
            <span className="text-[10px] bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded font-mono">
              admin.* subdomain ready
            </span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {portalType === 'ADMIN' ? 'Admin Email Address' : 'Email Address'}
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              placeholder={
                portalType === 'ADMIN'
                  ? 'admin@innovative.online'
                  : 'user@vistarax.com'
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
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              required
            />
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
            portalType === 'ADMIN'
              ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
          }`}
        >
          {loading
            ? 'Authenticating...'
            : portalType === 'ADMIN'
            ? 'Sign In to Admin Portal'
            : 'Sign In'}
          <ArrowRight className="w-4 h-4" />
        </button>

        {portalType === 'USER' ? (
          <div className="text-center text-xs text-slate-500 pt-1">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('register')}
              className="text-emerald-700 font-bold hover:underline"
            >
              Create an Account
            </button>
          </div>
        ) : (
          <div className="text-center text-[11px] text-slate-400 pt-1 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Authorized administrators only • Audited gateway</span>
          </div>
        )}
      </form>
    </div>
  );
};
