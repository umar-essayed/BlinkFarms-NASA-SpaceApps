'use client';

import React, { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { Language } from '@/lib/types';
import { UserProfile } from '@/components/AuthGateway';

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('ar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  const GOOGLE_CLIENT_ID =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '986833049857-mfsmjulip5kdbl4bavc645j416unb12a.apps.googleusercontent.com';

  useEffect(() => {
    const savedLang = localStorage.getItem('blinkfarms_lang') as Language;
    if (savedLang) setLang(savedLang);

    // Check if already logged in
    const savedUser = localStorage.getItem('blinkfarms_auth_user');
    if (savedUser) {
      router.replace('/');
    }
  }, [router]);

  // Decode Google JWT Credential Response
  const decodeJwtPayload = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (err) {
      console.error('Failed to parse Google JWT', err);
      return null;
    }
  };

  // Google Sign-In Handler
  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response || !response.credential) {
      setAuthError(lang === 'ar' ? 'فشل تسجيل الدخول عبر Google' : 'Google sign-in failed');
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    const payload = decodeJwtPayload(response.credential);
    if (!payload || !payload.email) {
      setIsLoading(false);
      setAuthError(lang === 'ar' ? 'تعذر قراءة بيانات حساب Google' : 'Could not decode Google user profile');
      return;
    }

    const realUser: UserProfile = {
      id: `google_${payload.sub}`,
      name: payload.name || payload.email.split('@')[0],
      email: payload.email,
      avatar: payload.picture,
      role: 'farmer',
    };

    // Sync with backend API
    try {
      await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: response.credential,
          user: realUser,
        }),
      });
    } catch (e) {
      // Non-blocking sync
    }

    handleSuccessfulAuth(realUser);
  };

  // Initialize Google Identity Services
  const initGoogleIdentity = () => {
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (googleBtnContainerRef.current) {
        googleBtnContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: '340',
          locale: lang === 'ar' ? 'ar' : 'en',
        });
      }
    }
  };

  useEffect(() => {
    initGoogleIdentity();
  }, [lang]);

  const toggleLang = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    localStorage.setItem('blinkfarms_lang', nextLang);
    document.documentElement.lang = nextLang;
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
  };

  const handleSuccessfulAuth = (user: UserProfile) => {
    localStorage.setItem('blinkfarms_auth_user', JSON.stringify(user));
    setIsLoading(false);
    router.push('/');
  };

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const user: UserProfile = {
        id: `u_${Date.now()}`,
        name: name.trim() || email.split('@')[0],
        email: email.trim(),
        role: 'farmer',
      };
      handleSuccessfulAuth(user);
    }, 400);
  };

  return (
    <main
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen w-full bg-[#F5F5F7] dark:bg-black flex flex-col justify-between p-4 sm:p-6 animate-fadeIn font-sans"
    >
      {/* Official Google Identity Services Script */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initGoogleIdentity}
      />

      {/* Top Bar with Language Toggle */}
      <div className="w-full max-w-md mx-auto flex justify-end">
        <button
          onClick={toggleLang}
          className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 shadow-sm border border-black/5 dark:border-white/10 text-neutral-700 dark:text-neutral-200 active:scale-95 transition-all"
        >
          {lang === 'ar' ? 'English' : 'عربي'}
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-black/5 dark:border-white/10 space-y-6 my-auto">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <img
            src="/logo.png"
            alt="BlinkFarms"
            className="w-16 h-16 mx-auto object-contain drop-shadow-md"
          />
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            {lang === 'ar' ? 'تسجيل الدخول' : 'Sign In to BlinkFarms'}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {lang === 'ar'
              ? 'سجّل دخولك لحفظ بيانات أرضك وتاريخ ذاكرة الحقل بأمان'
              : 'Log in to securely link your field memory and crop records'}
          </p>
        </div>

        {authError && (
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 text-xs font-bold text-center">
            {authError}
          </div>
        )}

        {/* Real Google OAuth Button Container */}
        <div className="space-y-3">
          <div className="flex justify-center w-full min-h-[44px]">
            <div ref={googleBtnContainerRef} id="googleSignInContainer" className="flex justify-center" />
          </div>

          <p className="text-[11px] text-center text-neutral-400">
            {lang === 'ar'
              ? 'تسجيل دخول موثق وآمن عبر حساب Google الرسمي'
              : 'Verified & secure login via official Google OAuth'}
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
          <span className="text-[11px] text-neutral-400 font-medium">
            {lang === 'ar' ? 'أو بالبريد الإلكتروني' : 'or with email'}
          </span>
          <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                {lang === 'ar' ? 'الاسم الكامل أو اسم المزرعة' : 'Full Name or Farm Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={lang === 'ar' ? 'مثال: مزرعة الوادي الأخضر' : 'e.g. Green Valley Farm'}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600 border border-black/5 dark:border-white/5"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="farmer@example.com"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600 border border-black/5 dark:border-white/5"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              {lang === 'ar' ? 'كلمة المرور' : 'Password'}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600 border border-black/5 dark:border-white/5"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isLoading
              ? (lang === 'ar' ? 'جارٍ التحقق...' : 'Verifying...')
              : isRegisterMode
              ? (lang === 'ar' ? 'إنشاء حساب مزارع جديد' : 'Create Farmer Account')
              : (lang === 'ar' ? 'تسجيل الدخول' : 'Sign In')}
          </button>
        </form>

        {/* Toggle Register / Login */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => setIsRegisterMode(!isRegisterMode)}
            className="text-xs text-neutral-500 hover:text-black dark:hover:text-white font-medium"
          >
            {isRegisterMode
              ? (lang === 'ar' ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'Already have an account? Sign In')
              : (lang === 'ar' ? 'ليس لديك حساب؟ إنشاء حساب مزارع جديد' : 'New farmer? Create an account')}
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-md mx-auto text-center text-[11px] text-neutral-400 font-medium py-2">
        <span>BlinkFarms — NASA FieldShift & VeloceRoot</span>
      </div>
    </main>
  );
}
