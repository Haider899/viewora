import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  PlaySquare,
  Wallet,
  Users,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  CreditCard,
  Layers,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  currentRoute: string;
  navigate: (route: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRoute, navigate }) => {
  const { user, wallet, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdminOrStaff =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'FINANCE_ADMIN' ||
    user?.role === 'CONTENT_ADMIN' ||
    user?.role === 'SUPPORT_AGENT';

  const navItemClass = (path: string) =>
    `px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
      currentRoute === path
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white/95 border-b border-slate-200/90 backdrop-blur-md shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => navigate('home')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <PlaySquare className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              Vistara<span className="text-emerald-600">X</span>
              <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                PRO
              </span>
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5">
          <button onClick={() => navigate('home')} className={navItemClass('home')}>
            Home
          </button>
          <button onClick={() => navigate('how-it-works')} className={navItemClass('how-it-works')}>
            How It Works
          </button>
          <button onClick={() => navigate('videos')} className={navItemClass('videos')}>
            Video Catalog
          </button>
          <button onClick={() => navigate('packages')} className={navItemClass('packages')}>
            Packages
          </button>
          {isAdminOrStaff && (
            <button
              onClick={() => navigate('admin')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              Admin Portal
            </button>
          )}
        </nav>

        {/* User Balance & Actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Dual-Currency Balance Pill */}
              <div
                onClick={() => navigate(isAdminOrStaff ? 'admin' : 'wallet')}
                className="cursor-pointer flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-500 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                  <span className="text-slate-400">USD:</span>
                  <span>${((wallet?.USD?.availableCents ?? 0) / 100).toFixed(2)}</span>
                </div>
                <div className="h-3.5 w-px bg-slate-200"></div>
                <div className="flex items-center gap-1 text-xs font-bold text-teal-700">
                  <span className="text-slate-400">PKR:</span>
                  <span>{((wallet?.PKR?.availableCents ?? 0) / 100).toLocaleString()}</span>
                </div>
              </div>

              {/* User Avatar & Logout */}
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900">{user.fullName}</div>
                  <div className="text-[10px] text-emerald-600 font-bold">{user.role}</div>
                </div>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-slate-200"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => navigate('login')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('register')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm shadow-emerald-500/20"
              >
                Get Started
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2 shadow-lg">
          <button
            onClick={() => {
              navigate('home');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left py-2 px-3 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Home
          </button>
          <button
            onClick={() => {
              navigate('how-it-works');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left py-2 px-3 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            How It Works
          </button>
          <button
            onClick={() => {
              navigate('videos');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left py-2 px-3 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Video Catalog
          </button>
          <button
            onClick={() => {
              navigate('packages');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left py-2 px-3 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Packages
          </button>
          <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
            {user ? (
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2 px-3 text-left text-rose-600 font-bold rounded-xl hover:bg-rose-50 flex items-center gap-2 text-xs"
              >
                <LogOut className="w-4 h-4" />
                Sign Out ({user.fullName})
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    navigate('login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 px-3 text-center text-slate-700 font-bold rounded-xl hover:bg-slate-100 text-xs"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    navigate('register');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 px-3 text-center bg-emerald-600 text-white font-bold rounded-xl text-xs"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
