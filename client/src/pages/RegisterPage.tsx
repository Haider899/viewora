import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { CompanyInfoModal } from '../components/CompanyInfoModal.js';
import {
  Lock,
  Mail,
  User,
  Phone,
  Tag,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  TrendingUp,
  Info,
  ShieldCheck,
} from 'lucide-react';

interface RegisterProps {
  navigate: (route: string) => void;
}

function getStrength(pw: string): { pct: number; label: string; color: string } {
  if (!pw) return { pct: 0, label: '', color: 'bg-slate-200' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { pct: 25, label: 'Weak', color: 'bg-rose-500' };
  if (score === 2) return { pct: 50, label: 'Fair', color: 'bg-amber-500' };
  if (score === 3) return { pct: 75, label: 'Good', color: 'bg-orange-500' };
  return { pct: 100, label: 'Strong', color: 'bg-emerald-600' };
}

export const RegisterPage: React.FC<RegisterProps> = ({ navigate }) => {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [companyInfoOpen, setCompanyInfoOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) setReferralCode(ref.toUpperCase());
  }, []);

  const strength = getStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const errs: typeof fieldErrors = {};
    if (fullName.trim().length < 2) errs.fullName = 'Enter your full name (at least 2 characters).';
    if (!email.trim() || !email.includes('@')) errs.email = 'Enter a valid email address.';
    if (password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (confirmPassword !== password) errs.confirmPassword = 'Passwords do not match.';
    if (!acceptedTerms) errs.terms = 'Please agree to the Terms of Service and Privacy Policy.';

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        referralCode: referralCode.trim() || undefined,
      });
      navigate('home');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#FFF3E6] via-[#FFF9F3] to-white pb-12 animate-page-in">
      <div className="max-w-md mx-auto px-4 pt-5 space-y-5">
        {/* Top Brand Row */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-sm">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900">U-ADS</span>
          </div>
        </div>

        {/* Compact Warm Peach Hero */}
        <div className="rounded-3xl bg-gradient-to-br from-[#FFE8D1] via-[#FFF3E6] to-[#FFEAD6] p-4 sm:p-5 border border-orange-200/60 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              Start Earning with <span className="text-orange-600">U-ADS</span>
            </h1>
            <p className="text-[11px] text-slate-600 font-medium">
              Create your account — watch ads and earn 95% advertiser revenue share.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
            $
          </div>
        </div>

        {/* Floating White Sign Up Card */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-white rounded-3xl border border-orange-100 shadow-xl shadow-orange-950/5 p-6 space-y-3.5"
        >
          <div className="text-center space-y-1 pb-1">
            <h2 className="text-lg font-extrabold text-slate-900">Create Your Account</h2>
            <p className="text-xs text-slate-500">Join U-Ads in under a minute</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Name <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setFieldErrors((f) => ({ ...f, fullName: undefined }));
                }}
                className={`w-full h-10 bg-slate-50 border rounded-xl pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 ${
                  fieldErrors.fullName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-orange-500'
                }`}
              />
            </div>
            {fieldErrors.fullName && (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {fieldErrors.fullName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
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
                className={`w-full h-10 bg-slate-50 border rounded-xl pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 ${
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
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((f) => ({ ...f, password: undefined }));
                }}
                className={`w-full h-10 bg-slate-50 border rounded-xl pl-10 pr-10 text-xs text-slate-900 placeholder-slate-400 ${
                  fieldErrors.password ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-orange-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && (
              <div className="mt-1.5 space-y-1">
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${strength.color}`}
                    style={{ width: `${strength.pct}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500">
                  Strength: <strong className="text-slate-800">{strength.label}</strong>
                </div>
              </div>
            )}
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Confirm Password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setFieldErrors((f) => ({ ...f, confirmPassword: undefined }));
                }}
                className={`w-full h-10 bg-slate-50 border rounded-xl pl-10 pr-10 text-xs text-slate-900 placeholder-slate-400 ${
                  fieldErrors.confirmPassword
                    ? 'border-rose-400 bg-rose-50/30'
                    : 'border-slate-200 focus:border-orange-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone (Optional)</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Optional phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Referral Code</label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Optional code"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 text-xs font-mono text-slate-900 placeholder-slate-400 focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => {
                  setAcceptedTerms(e.target.checked);
                  setFieldErrors((f) => ({ ...f, terms: undefined }));
                }}
                className="mt-0.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="leading-relaxed">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => navigate('terms')}
                  className="text-orange-600 font-bold hover:underline cursor-pointer"
                >
                  Terms of Service
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={() => navigate('privacy')}
                  className="text-orange-600 font-bold hover:underline cursor-pointer"
                >
                  Privacy Policy
                </button>
                . <span className="text-rose-600">*</span>
              </span>
            </label>
            {fieldErrors.terms && (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {fieldErrors.terms}
              </p>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full !h-12 !rounded-full !text-sm shadow-lg shadow-orange-500/25"
          >
            <span>{loading ? 'Creating Account…' : 'Sign Up'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="text-center text-xs text-slate-500 pt-1">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('login')}
              className="text-orange-600 font-extrabold hover:underline cursor-pointer"
            >
              Log In
            </button>
          </div>
        </form>

        {/* "or" + View Company Information & Licenses */}
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

      <CompanyInfoModal open={companyInfoOpen} onClose={() => setCompanyInfoOpen(false)} />
    </div>
  );
};
