import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';
import { useAuth } from './AuthContext.js';

export type WebsiteTheme = 'orange' | 'green';

interface ThemeContextValue {
  theme: WebsiteTheme;
  defaultTheme: WebsiteTheme;
  authBannerImageUrl: string;
  setMemberTheme: (next: WebsiteTheme) => Promise<void>;
  refreshThemeConfig: () => Promise<void>;
}

const STORAGE_KEY = 'uads_member_theme';

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'orange',
  defaultTheme: 'orange',
  authBannerImageUrl: '',
  setMemberTheme: async () => {},
  refreshThemeConfig: async () => {},
});

function applyThemeToDocument(theme: WebsiteTheme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, refreshUser } = useAuth();
  const [defaultTheme, setDefaultTheme] = useState<WebsiteTheme>('orange');
  const [authBannerImageUrl, setAuthBannerImageUrl] = useState<string>('');
  const [localChoice, setLocalChoice] = useState<WebsiteTheme | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'green' || saved === 'orange' ? saved : null;
    } catch {
      return null;
    }
  });

  const refreshThemeConfig = useCallback(async () => {
    try {
      const res = await api.getThemeConfig();
      if (res.success && res.data) {
        const dt: WebsiteTheme = res.data.defaultTheme === 'green' ? 'green' : 'orange';
        setDefaultTheme(dt);
        setAuthBannerImageUrl(res.data.authBannerImageUrl || '');
      }
    } catch {
      // silent fallback
    }
  }, []);

  useEffect(() => {
    refreshThemeConfig();
  }, [refreshThemeConfig]);

  // Priority: logged-in member's own saved DB theme > cached choice > Admin default theme
  const resolvedTheme: WebsiteTheme =
    user?.preferredTheme === 'green' || user?.preferredTheme === 'orange'
      ? user.preferredTheme
      : user
      ? defaultTheme
      : localChoice || defaultTheme;

  // Sync member's saved DB theme to localStorage so their login screen matches on next visit
  useEffect(() => {
    if (user?.preferredTheme === 'green' || user?.preferredTheme === 'orange') {
      setLocalChoice(user.preferredTheme);
      try {
        localStorage.setItem(STORAGE_KEY, user.preferredTheme);
      } catch {}
    }
  }, [user?.preferredTheme]);

  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  const setMemberTheme = async (next: WebsiteTheme) => {
    const normalized: WebsiteTheme = next === 'green' ? 'green' : 'orange';
    setLocalChoice(normalized);
    applyThemeToDocument(normalized);
    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {}

    if (user) {
      await api.updateMyTheme(normalized).catch(() => {});
      await refreshUser().catch(() => {});
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: resolvedTheme,
        defaultTheme,
        authBannerImageUrl,
        setMemberTheme,
        refreshThemeConfig,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
