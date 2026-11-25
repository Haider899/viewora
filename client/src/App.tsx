import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ToastProvider } from './components/ToastProvider.js';
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';
import { SupportChatWidget } from './components/SupportChatWidget.js';
import { HomePage } from './pages/HomePage.js';
import { HowItWorksPage } from './pages/HowItWorksPage.js';
import { VideoCatalogPage } from './pages/VideoCatalogPage.js';
import { PackagesPage } from './pages/PackagesPage.js';
import { UserDashboardPage } from './pages/UserDashboardPage.js';
import { AdminDashboardPage } from './pages/AdminDashboardPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { TermsPage } from './pages/TermsPage.js';
import { PrivacyPage } from './pages/PrivacyPage.js';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<string>('home');
  const [routeState, setRouteState] = useState<any>(null);

  const navigate = (route: string, state?: any) => {
    setCurrentRoute(route);
    setRouteState(state || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading U-Ads Platform...</p>
      </div>
    );
  }

  // 1. If Super Admin or Staff Role is logged in -> Directly show Dedicated Admin Management Portal
  if (
    user &&
    ['SUPER_ADMIN', 'FINANCE_ADMIN', 'CONTENT_ADMIN', 'SUPPORT_AGENT'].includes(user.role)
  ) {
    return <AdminDashboardPage />;
  }

  // 2. If Regular User is logged in -> Directly show Dedicated User Portal (No marketing clutter / intro)
  if (user && user.role === 'USER') {
    return <UserDashboardPage />;
  }

  // 2.5 If visiting admin.* subdomain (or ?portal=admin) while not logged in -> Directly show dedicated Administrator Gateway
  const isAdminSubdomain =
    typeof window !== 'undefined' &&
    (window.location.hostname.toLowerCase().startsWith('admin.') ||
      new URLSearchParams(window.location.search).get('portal') === 'admin');

  if (isAdminSubdomain) {
    return (
      <div className="min-h-screen flex flex-col justify-center bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
        <LoginPage navigate={navigate} />
      </div>
    );
  }

  // 3. If Public Visitor (Not logged in) -> Show Marketing Landing & Auth Pages
  const renderPublicPage = () => {
    switch (currentRoute) {
      case 'home':
        return <HomePage navigate={navigate} />;
      case 'how-it-works':
        return <HowItWorksPage navigate={navigate} />;
      case 'videos':
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <VideoCatalogPage navigate={navigate} />
          </div>
        );
      case 'packages':
        return <PackagesPage navigate={navigate} />;
      case 'login':
        return <LoginPage navigate={navigate} />;
      case 'register':
        return <RegisterPage navigate={navigate} />;
      case 'terms':
        return <TermsPage navigate={navigate} />;
      case 'privacy':
        return <PrivacyPage navigate={navigate} />;
      default:
        return <HomePage navigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      <Navbar currentRoute={currentRoute} navigate={navigate} />
      <main className="flex-1 animate-page-in" key={currentRoute}>{renderPublicPage()}</main>
      <Footer navigate={navigate} />
      <SupportChatWidget navigate={navigate} />
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
