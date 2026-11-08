'use client';

import React, { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { Language } from '@/lib/types';
import { UserProfile } from '@/components/AuthGateway';
import { supabase } from '@/lib/supabaseClient';

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
  const [showPassword, setShowPassword] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  const GOOGLE_CLIENT_ID =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '986833049857-mfsmjulip5kdbl4bavc645j416unb12a.apps.googleusercontent.com';

  useEffect(() => {
    const savedLang = localStorage.getItem('blinkfarms_lang') as Language;
    if (savedLang) setLang(savedLang);

    // Check if user is already logged in
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

  // Google Sign-In Callback
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

    // Non-blocking sync with backend
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
      // Non-blocking
    }

    handleSuccessfulAuth(realUser);
  };

  // Initialize Google Identity Services with Dark / Filled Black Theme
  const initGoogleIdentity = () => {
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      setGoogleLoaded(true);
      try {
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
            theme: 'filled_black', // sleek black theme matching dark UI
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            logo_alignment: 'left',
            width: 260,
            locale: lang === 'ar' ? 'ar' : 'en',
          });
        }
      } catch (err) {
        console.warn('Error initializing Google GSI button:', err);
      }
    }
  };

  useEffect(() => {
    initGoogleIdentity();
  }, [lang, googleLoaded]);

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

  // Real Supabase Email/Password Authentication
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setAuthError(lang === 'ar' ? 'يرجى إدخال البريد وكلمة المرور' : 'Please provide email and password');
      return;
    }

    setIsLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      if (isRegisterMode) {
        // --- 1. Supabase User Registration ---
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              name: name.trim() || email.split('@')[0],
              role: 'farmer',
            },
          },
        });

        if (error) throw error;

        const newUser: UserProfile = {
          id: data.user?.id || `u_${Date.now()}`,
          name: name.trim() || data.user?.user_metadata?.name || email.split('@')[0],
          email: email.trim(),
          role: 'farmer',
        };

        handleSuccessfulAuth(newUser);
      } else {
        // --- 2. Supabase User Sign In ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) throw error;

        if (data.user) {
          const loggedUser: UserProfile = {
            id: data.user.id,
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || (lang === 'ar' ? 'مزارع معتمد' : 'Verified Farmer'),
            email: data.user.email || email.trim(),
            role: 'farmer',
          };
          handleSuccessfulAuth(loggedUser);
        }
      }
    } catch (err: any) {
      console.error('Supabase auth error:', err);
      let errMsg = err.message || 'حدث خطأ أثناء المصادقة';
      
      if (errMsg.includes('Invalid login credentials')) {
        errMsg = lang === 'ar' ? 'بيانات الدخول غير صحيحة، تأكد من البريد وكلمة المرور' : 'Invalid email or password';
      } else if (errMsg.includes('User already registered')) {
        errMsg = lang === 'ar' ? 'هذا البريد مسجل مسبقاً، يرجى التبديل لتسجيل الدخول' : 'User already registered. Please sign in';
      } else if (errMsg.includes('Password should be at least')) {
        errMsg = lang === 'ar' ? 'كلمة المرور يجب ألا تقل عن 6 أحرف' : 'Password must be at least 6 characters';
      } else if (errMsg.includes('Email not confirmed')) {
        errMsg = lang === 'ar' ? 'يرجى تأكيد بريدك الإلكتروني أولاً' : 'Email not confirmed yet';
      }
      setAuthError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="h-[100dvh] max-h-[100dvh] w-full bg-[#0a0a0c] text-white flex flex-col justify-between p-3 sm:p-5 overflow-hidden font-sans select-none"
    >
      {/* Official Google Identity Services Script */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initGoogleIdentity}
      />

      {/* Top Header */}
      <header className="w-full max-w-sm sm:max-w-md mx-auto flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="BlinkFarms Logo" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
          <span className="font-black text-sm tracking-tight text-white/90">
            BlinkFarms
          </span>
        </div>
        <button
          onClick={toggleLang}
          className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white/90 active:scale-95 transition-all"
        >
          {lang === 'ar' ? 'English' : 'عربي'}
        </button>
      </header>

      {/* Main Single-Screen Form Card (No Scroll) */}
      <div className="w-full max-w-sm sm:max-w-md mx-auto bg-neutral-900/90 backdrop-blur-2xl rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/10 space-y-3.5 my-auto shrink-0">
        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
            {isRegisterMode
              ? (lang === 'ar' ? 'إنشاء حساب مزارع جديد' : 'Create Farmer Account')
              : (lang === 'ar' ? 'تسجيل الدخول' : 'Sign In')}
          </h1>
          <p className="text-[11px] text-neutral-400">
            {lang === 'ar'
              ? 'سجّل دخولك لربط بيانات حقلك بمراصد ناسا الفضائية'
              : 'Sign in to access NASA Earth Observation records'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-white/5 rounded-2xl text-[11px] font-bold border border-white/5">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setAuthError(null);
              setAuthSuccess(null);
            }}
            className={`py-1.5 rounded-xl transition-all ${
              !isRegisterMode
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(true);
              setAuthError(null);
              setAuthSuccess(null);
            }}
            className={`py-1.5 rounded-xl transition-all ${
              isRegisterMode
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'حساب جديد' : 'Sign Up'}
          </button>
        </div>

        {/* Alerts */}
        {authError && (
          <div className="py-2 px-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-[11px] font-semibold text-center flex items-center justify-center gap-1.5">
            <span>⚠️</span>
            <span>{authError}</span>
          </div>
        )}

        {authSuccess && (
          <div className="py-2 px-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-[11px] font-semibold text-center flex items-center justify-center gap-1.5">
            <span>✅</span>
            <span>{authSuccess}</span>
          </div>
        )}

        {/* Black Theme Google Sign-In */}
        <div className="space-y-1.5 pt-0.5">
          <div className="w-full flex justify-center items-center min-h-[42px]">
            <div
              key={lang}
              ref={googleBtnContainerRef}
              id="googleSignInContainer"
              className="flex justify-center items-center w-full max-w-[260px] overflow-hidden"
            />
          </div>
          <p className="text-[10px] text-center text-neutral-400">
            {lang === 'ar'
              ? 'تسجيل سريع ومباشر بحساب Google'
              : 'Direct one-click sign in with Google'}
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2.5">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
            {lang === 'ar' ? 'أو بالبريد عبر Supabase' : 'or with Supabase'}
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Supabase Email/Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-2.5">
          {isRegisterMode && (
            <div>
              <label className="block text-[10px] font-bold text-neutral-300 mb-0.5">
                {lang === 'ar' ? 'اسم المزارع أو الحقل' : 'Farmer or Field Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={lang === 'ar' ? 'مثال: مزرعة الحاج عبد الله' : 'e.g. Green Valley Farm'}
                className="w-full px-3 py-2 rounded-xl bg-white/5 text-xs font-medium text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1.5 focus:ring-emerald-500 border border-white/10 transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-neutral-300 mb-0.5">
              {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="farmer@example.com"
              className="w-full px-3 py-2 rounded-xl bg-white/5 text-xs font-medium text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1.5 focus:ring-emerald-500 border border-white/10 transition-all"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-0.5">
              <label className="block text-[10px] font-bold text-neutral-300">
                {lang === 'ar' ? 'كلمة المرور' : 'Password'}
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] text-neutral-400 hover:text-white"
              >
                {showPassword
                  ? (lang === 'ar' ? 'إخفاء' : 'Hide')
                  : (lang === 'ar' ? 'إظهار' : 'Show')}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-xl bg-white/5 text-xs font-medium text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1.5 focus:ring-emerald-500 border border-white/10 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{lang === 'ar' ? 'جارٍ الاتصال...' : 'Connecting...'}</span>
              </>
            ) : isRegisterMode ? (
              <span>{lang === 'ar' ? 'إنشاء حساب عبر Supabase' : 'Sign Up with Supabase'}</span>
            ) : (
              <span>{lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</span>
            )}
          </button>
        </form>
      </div>

      {/* Footer Info */}
      <footer className="w-full max-w-sm sm:max-w-md mx-auto text-center text-[10px] text-neutral-500 font-medium shrink-0">
        <span>BlinkFarms — NASA Space Apps Challenge 2026</span>
      </footer>
    </main>
  );
}
