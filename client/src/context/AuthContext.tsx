import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';
import { User, WalletSummary } from '../types/index.js';

interface AuthContextType {
  user: User | null;
  wallet: WalletSummary | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<boolean>;
  register: (data: { email: string; password: string; fullName: string; phone?: string; referralCode?: string }) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshWallet: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshWallet = async () => {
    try {
      const res = await api.getWalletSummary();
      if (res.success && res.data) {
        setWallet(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch wallet summary:', err);
    }
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('vistarax_token');
      if (!token) {
        setUser(null);
        setWallet(null);
        setLoading(false);
        return;
      }

      const res = await api.getCurrentUser();
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        await refreshWallet();
      } else {
        api.setToken(null);
        setUser(null);
        setWallet(null);
      }
    } catch {
      api.setToken(null);
      setUser(null);
      setWallet(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: { email: string; password: string }): Promise<boolean> => {
    const res = await api.login(credentials);
    if (res.success && res.data) {
      api.setToken(res.data.token);
      setUser(res.data.user);
      await refreshWallet();
      return true;
    }
    throw new Error(res.error?.message || 'Login failed.');
  };

  const register = async (data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    referralCode?: string;
  }): Promise<boolean> => {
    const res = await api.register(data);
    if (res.success && res.data) {
      api.setToken(res.data.token);
      setUser(res.data.user);
      await refreshWallet();
      return true;
    }
    throw new Error(res.error?.message || 'Registration failed.');
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    setWallet(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        loading,
        login,
        register,
        logout,
        refreshUser,
        refreshWallet,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
