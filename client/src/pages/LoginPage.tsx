import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { PlaySquare, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  navigate: (route: string) => void;
}

export const LoginPage: React.FC<LoginProps> = ({ navigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      await login({ email: email.trim(), password });
      navigate('home');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setErrorMsg(null);
    setLoading(true);
    try {
      await login({ email: e, password: p });
      navigate('home');
    } catch (err: any) {
      setErrorMsg(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
          <PlaySquare className="w-6 h-6 text-white stroke-[2.5]" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Welcome Back</h1>
        <p className="text-xs text-slate-500">
          Sign in to access your video catalog, dual-currency wallet, and referral network.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              placeholder="user@vistarax.com"
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
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center justify-center gap-2 text-xs shadow-sm shadow-emerald-600/20"
        >
          {loading ? 'Authenticating...' : 'Sign In'}
          <ArrowRight className="w-4 h-4" />
        </button>

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
      </form>

      {/* Quick Demo Access Bar */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-center">
          Instant Evaluation Logins
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleQuickLogin('admin@vistarax.com', 'VistaraSecure2026!')}
            className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 font-bold text-center transition-colors shadow-2xs"
          >
            Super Admin
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('finance@vistarax.com', 'VistaraSecure2026!')}
            className="p-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 font-bold text-center transition-colors shadow-2xs"
          >
            Finance Admin
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('user@vistarax.com', 'VistaraSecure2026!')}
            className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-center transition-colors col-span-2 shadow-2xs"
          >
            Active Member (David Sterling)
          </button>
        </div>
      </div>
    </div>
  );
};
