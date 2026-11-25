import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  PlaySquare,
  Lock,
  Mail,
  User,
  Phone,
  Tag,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
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
  if (score === 3) return { pct: 75, label: 'Good', color: 'bg-emerald-500' };
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
    <div className="max-w-md mx-auto px-4 py-12 space-y-6 animate-page-in">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto shadow-md shadow-emerald-600/20">
          <PlaySquare className="w-6 h-6 text-white stroke-[2.3]" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Create your U-Ads account</h1>
        <p className="text-xs text-slate-500">
          Start watching verified campaigns and managing your USD wallets.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="card-white p-6 sm:p-7 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
              className={`w-full h-10 bg-slate-50 border rounded-[10px] pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 ${
                fieldErrors.fullName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-emerald-500'
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
              className={`w-full h-10 bg-slate-50 border rounded-[10px] pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 ${
                fieldErrors.email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-emerald-500'
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
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
              className={`w-full h-10 bg-slate-50 border rounded-[10px] pl-10 pr-10 text-xs text-slate-900 placeholder-slate-400 ${
                fieldErrors.password ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-emerald-500'
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
            <div className="mt-2 space-y-1">
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
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
              className={`w-full h-10 bg-slate-50 border rounded-[10px] pl-10 pr-10 text-xs text-slate-900 placeholder-slate-400 ${
                fieldErrors.confirmPassword
                  ? 'border-rose-400 bg-rose-50/30'
                  : 'border-slate-200 focus:border-emerald-500'
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone (Optional)</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Optional contact phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-[10px] pl-10 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Referral Code</label>
            <div className="relative">
              <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Optional code"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-[10px] pl-10 pr-3 text-xs font-mono text-slate-900 placeholder-slate-400 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Terms & Privacy Checkbox */}
        <div>
          <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => {
                setAcceptedTerms(e.target.checked);
                setFieldErrors((f) => ({ ...f, terms: undefined }));
              }}
              className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="leading-relaxed">
              I agree to the{' '}
              <button
                type="button"
                onClick={() => navigate('terms')}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => navigate('privacy')}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
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

        <button type="submit" disabled={loading} className="btn-primary w-full !h-11">
          <span>{loading ? 'Creating Account…' : 'Create Account'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="text-center text-xs text-slate-500 pt-1">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('login')}
            className="text-emerald-700 font-bold hover:underline cursor-pointer"
          >
            Sign in
          </button>
        </div>
      </form>
    </div>
  );
};
