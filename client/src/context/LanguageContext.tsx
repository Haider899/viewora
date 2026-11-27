import React, { createContext, useContext, useState, useEffect } from 'react';

export type LanguageCode = 'EN' | 'UR' | 'AR' | 'ES' | 'FR';

export const SUPPORTED_LANGUAGES: Array<{ code: LanguageCode; label: string; native: string; dir: 'ltr' | 'rtl' }> = [
  { code: 'EN', label: 'English', native: 'English', dir: 'ltr' },
  { code: 'UR', label: 'Urdu', native: 'اردو', dir: 'rtl' },
  { code: 'AR', label: 'Arabic', native: 'العربية', dir: 'rtl' },
  { code: 'ES', label: 'Spanish', native: 'Español', dir: 'ltr' },
  { code: 'FR', label: 'French', native: 'Français', dir: 'ltr' },
];

const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  EN: {
    welcomeBack: 'Welcome Back!',
    loginSubtitle: 'Login to your account to continue',
    emailOrUsername: 'Email or Username',
    password: 'Password',
    logIn: 'Log In',
    signingIn: 'Signing in…',
    forgotPassword: 'Forgot Password?',
    newUser: 'New User?',
    signUp: 'Sign Up',
    createAccount: 'Create Your Account',
    createSubtitle: 'Join U-Ads in under a minute',
    fullName: 'Full Name',
    emailAddress: 'Email Address',
    confirmPassword: 'Confirm Password',
    alreadyHaveAccount: 'Already have an account?',
    signIn: 'Sign In',
    heroLine1: 'Grow Your',
    heroLine2: 'Earnings with',
    heroSub: 'Watch Ads, Earn Real USD & Grow with Our Trusted Platform',
    startEarningWith: 'Start Earning with',
    signupHeroSub: 'Create your account — watch ads and earn 95% advertiser revenue share.',
    secureFooter: 'A secure and reliable platform for your financial growth and success.',
    or: 'or',
    home: 'Home',
    ads: 'Ads',
    packages: 'Packages',
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    referrals: 'Referrals',
    transactions: 'Transactions',
    support: 'Support',
    profile: 'Profile',
    settings: 'Settings',
  },
  UR: {
    welcomeBack: 'خوش آمدید!',
    loginSubtitle: 'جاری رکھنے کے لیے اپنے اکاؤنٹ میں لاگ ان کریں',
    emailOrUsername: 'ای میل یا یوزرنیم',
    password: 'پاس ورڈ',
    logIn: 'لاگ ان کریں',
    signingIn: 'لاگ ان ہو رہا ہے…',
    forgotPassword: 'پاس ورڈ بھول گئے؟',
    newUser: 'نئے صارف؟',
    signUp: 'اکاؤنٹ بنائیں',
    createAccount: 'نیا اکاؤنٹ بنائیں',
    createSubtitle: 'ایک منٹ سے کم وقت میں U-Ads جوائن کریں',
    fullName: 'پورا نام',
    emailAddress: 'ای میل ایڈریس',
    confirmPassword: 'پاس ورڈ کی تصدیق کریں',
    alreadyHaveAccount: 'پہلے سے اکاؤنٹ موجود ہے؟',
    signIn: 'لاگ ان',
    heroLine1: 'اپنی کمائی',
    heroLine2: 'بڑھائیں',
    heroSub: 'اشتہارات دیکھیں، حقیقی USD کمائیں اور اعتماد کے ساتھ آگے بڑھیں',
    startEarningWith: 'کمائی شروع کریں',
    signupHeroSub: 'اپنا اکاؤنٹ بنائیں — اشتہارات دیکھیں اور 95% ریونیو شیئر کمائیں۔',
    secureFooter: 'آپ کی مالی ترقی اور کامیابی کے لیے ایک محفوظ اور قابل اعتماد پلیٹ فارم۔',
    or: 'یا',
    home: 'ہوم',
    ads: 'اشتہارات',
    packages: 'پیکجز',
    deposit: 'ڈپازٹ',
    withdraw: 'ودڈرال',
    referrals: 'ریفرلز',
    transactions: 'لین دین',
    support: 'سپورٹ',
    profile: 'پروفائل',
    settings: 'سیٹنگز',
  },
  AR: {
    welcomeBack: 'مرحباً بعودتك!',
    loginSubtitle: 'سجّل الدخول إلى حسابك للمتابعة',
    emailOrUsername: 'البريد الإلكتروني أو اسم المستخدم',
    password: 'كلمة المرور',
    logIn: 'تسجيل الدخول',
    signingIn: 'جارٍ تسجيل الدخول…',
    forgotPassword: 'نسيت كلمة المرور؟',
    newUser: 'مستخدم جديد؟',
    signUp: 'إنشاء حساب',
    createAccount: 'أنشئ حسابك',
    createSubtitle: 'انضم إلى U-Ads في أقل من دقيقة',
    fullName: 'الاسم الكامل',
    emailAddress: 'البريد الإلكتروني',
    confirmPassword: 'تأكيد كلمة المرور',
    alreadyHaveAccount: 'لديك حساب بالفعل؟',
    signIn: 'تسجيل الدخول',
    heroLine1: 'نمِّ أرباحك',
    heroLine2: 'مع منصة',
    heroSub: 'شاهد الإعلانات واكسب دولارات حقيقية عبر منصتنا الموثوقة',
    startEarningWith: 'ابدأ الربح مع',
    signupHeroSub: 'أنشئ حسابك — شاهد الإعلانات واربح 95% من عوائد المعلنين.',
    secureFooter: 'منصة آمنة وموثوقة لنموك المالي ونجاحك.',
    or: 'أو',
    home: 'الرئيسية',
    ads: 'الإعلانات',
    packages: 'الباقات',
    deposit: 'إيداع',
    withdraw: 'سحب',
    referrals: 'الإحالات',
    transactions: 'المعاملات',
    support: 'الدعم',
    profile: 'الملف الشخصي',
    settings: 'الإعدادات',
  },
  ES: {
    welcomeBack: '¡Bienvenido!',
    loginSubtitle: 'Inicia sesión en tu cuenta para continuar',
    emailOrUsername: 'Correo electrónico o usuario',
    password: 'Contraseña',
    logIn: 'Iniciar sesión',
    signingIn: 'Iniciando sesión…',
    forgotPassword: '¿Olvidaste tu contraseña?',
    newUser: '¿Nuevo usuario?',
    signUp: 'Registrarse',
    createAccount: 'Crea tu cuenta',
    createSubtitle: 'Únete a U-Ads en menos de un minuto',
    fullName: 'Nombre completo',
    emailAddress: 'Correo electrónico',
    confirmPassword: 'Confirmar contraseña',
    alreadyHaveAccount: '¿Ya tienes una cuenta?',
    signIn: 'Iniciar sesión',
    heroLine1: 'Haz crecer tus',
    heroLine2: 'ganancias con',
    heroSub: 'Mira anuncios, gana USD reales y crece en nuestra plataforma',
    startEarningWith: 'Empieza a ganar con',
    signupHeroSub: 'Crea tu cuenta — mira anuncios y gana el 95% de los ingresos.',
    secureFooter: 'Una plataforma segura y confiable para tu crecimiento financiero.',
    or: 'o',
    home: 'Inicio',
    ads: 'Anuncios',
    packages: 'Paquetes',
    deposit: 'Depositar',
    withdraw: 'Retirar',
    referrals: 'Referidos',
    transactions: 'Transacciones',
    support: 'Soporte',
    profile: 'Perfil',
    settings: 'Ajustes',
  },
  FR: {
    welcomeBack: 'Bon retour !',
    loginSubtitle: 'Connectez-vous à votre compte pour continuer',
    emailOrUsername: 'E-mail ou nom d’utilisateur',
    password: 'Mot de passe',
    logIn: 'Se connecter',
    signingIn: 'Connexion…',
    forgotPassword: 'Mot de passe oublié ?',
    newUser: 'Nouvel utilisateur ?',
    signUp: 'S’inscrire',
    createAccount: 'Créez votre compte',
    createSubtitle: 'Rejoignez U-Ads en moins d’une minute',
    fullName: 'Nom complet',
    emailAddress: 'Adresse e-mail',
    confirmPassword: 'Confirmer le mot de passe',
    alreadyHaveAccount: 'Vous avez déjà un compte ?',
    signIn: 'Se connecter',
    heroLine1: 'Développez vos',
    heroLine2: 'revenus avec',
    heroSub: 'Regardez des annonces et gagnez de vrais USD sur notre plateforme',
    startEarningWith: 'Commencez à gagner avec',
    signupHeroSub: 'Créez votre compte — regardez des annonces et partagez 95% des revenus.',
    secureFooter: 'Une plateforme sûre et fiable pour votre croissance financière.',
    or: 'ou',
    home: 'Accueil',
    ads: 'Annonces',
    packages: 'Forfaits',
    deposit: 'Dépôt',
    withdraw: 'Retrait',
    referrals: 'Parrainages',
    transactions: 'Transactions',
    support: 'Support',
    profile: 'Profil',
    settings: 'Paramètres',
  },
};

interface LanguageContextValue {
  lang: LanguageCode;
  setLang: (code: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
}

const STORAGE_KEY = 'uads_language';

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'EN',
  setLang: () => {},
  t: (key, fallback) => fallback || TRANSLATIONS.EN[key] || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
      if (saved && saved in TRANSLATIONS) return saved;
    } catch {}
    return 'EN';
  });

  useEffect(() => {
    const meta = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];
    document.documentElement.lang = lang.toLowerCase();
    document.documentElement.dir = meta.dir;
  }, [lang]);

  const setLang = (code: LanguageCode) => {
    setLangState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {}
  };

  const t = (key: string, fallback?: string) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.EN[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
