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

  // Initialize Google Identity Services
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
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            logo_alignment: 'left',
            width: 270,
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
      setAuthError(lang === 'ar' ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please provide email and password');
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

        if (data.session) {
          // Direct login without required email confirmation
          handleSuccessfulAuth(newUser);
        } else {
          // Email confirmation is enabled in Supabase project
          setAuthSuccess(
            lang === 'ar'
              ? 'تم إنشاء الحساب بنجاح! إذا كانت رسالة التأكيد مطلوبة تفقد بريدك، أو يمكنك الدخول مباشرة الآن.'
              : 'Account created! Please check your email or proceed to sign in.'
          );
          // Also allow immediate transition
          handleSuccessfulAuth(newUser);
        }
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
      
      // Friendly localized error messages
      if (errMsg.includes('Invalid login credentials')) {
        errMsg = lang === 'ar' ? 'بيانات الدخول غير صحيحة، تأكد من البريد وكلمة المرور' : 'Invalid email or password';
      } else if (errMsg.includes('User already registered')) {
        errMsg = lang === 'ar' ? 'هذا البريد مسجل مسبقاً، يرجى التبديل لتسجيل الدخول' : 'User already registered. Please sign in';
      } else if (errMsg.includes('Password should be at least')) {
        errMsg = lang === 'ar' ? 'كلمة المرور يجب ألا تقل عن 6 أحرف' : 'Password must be at least 6 characters';
      } else if (errMsg.includes('Email not confirmed')) {
        errMsg = lang === 'ar' ? 'يرجى تأكيد بريدك الإلكتروني أولاً أو تواصل مع الدعم' : 'Email not confirmed yet';
      }
      setAuthError(errMsg);
    } finally {
      setIsLoading(false);
    }
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
      <div className="w-full max-w-sm sm:max-w-md mx-auto flex justify-between items-center py-2">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="BlinkFarms Logo" className="w-8 h-8 object-contain" />
          <span className="font-black text-sm tracking-tight text-neutral-800 dark:text-neutral-200">
            BlinkFarms
          </span>
        </div>
        <button
          onClick={toggleLang}
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 shadow-sm border border-black/5 dark:border-white/10 text-neutral-700 dark:text-neutral-200 active:scale-95 transition-all hover:bg-neutral-50"
        >
          {lang === 'ar' ? 'English' : 'عربي'}
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-sm sm:max-w-md mx-auto bg-white dark:bg-neutral-900 rounded-[2rem] p-6 sm:p-8 shadow-xl border border-black/5 dark:border-white/10 space-y-5 my-auto">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            {isRegisterMode
              ? (lang === 'ar' ? 'إنشاء حساب مزارع جديد' : 'Create Farmer Account')
              : (lang === 'ar' ? 'تسجيل الدخول' : 'Welcome Back')}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {lang === 'ar'
              ? 'سجّل دخولك لحفظ بيانات أرضك وربطها بنظام ناسا للرصد الزراعي'
              : 'Sign in to access your NASA Earth Observation farm records'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setAuthError(null);
              setAuthSuccess(null);
            }}
            className={`py-2 rounded-xl transition-all ${
              !isRegisterMode
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
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
            className={`py-2 rounded-xl transition-all ${
              isRegisterMode
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            {lang === 'ar' ? 'حساب جديد' : 'Sign Up'}
          </button>
        </div>

        {/* Alerts */}
        {authError && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs font-semibold text-center flex items-center justify-center gap-2">
            <span>⚠️</span>
            <span>{authError}</span>
          </div>
        )}

        {authSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold text-center flex items-center justify-center gap-2">
            <span>✅</span>
            <span>{authSuccess}</span>
          </div>
        )}

        {/* Sleek Google Sign-In Container */}
        <div className="space-y-2 pt-1">
          <div className="w-full flex justify-center items-center min-h-[44px]">
            <div
              ref={googleBtnContainerRef}
              id="googleSignInContainer"
              className="flex justify-center items-center w-full max-w-[280px]"
            />
          </div>
          <p className="text-[11px] text-center text-neutral-400">
            {lang === 'ar'
              ? 'تسجيل سريع ومباشر بحساب Google'
              : 'Direct one-click sign in with Google'}
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
          <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">
            {lang === 'ar' ? 'أو بالبريد الإلكتروني' : 'or with email'}
          </span>
          <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        </div>

        {/* Supabase Email/Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3.5">
          {isRegisterMode && (
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                {lang === 'ar' ? 'اسم المزارع أو الحقل' : 'Farmer or Field Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={lang === 'ar' ? 'مثال: مزرعة الحاج عبد الله' : 'e.g. Green Valley Farm'}
                className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 text-xs font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-neutral-200 dark:border-neutral-700 transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-300 mb-1">
              {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="farmer@example.com"
              className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 text-xs font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-neutral-200 dark:border-neutral-700 transition-all"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
                {lang === 'ar' ? 'كلمة المرور' : 'Password'}
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
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
              className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 text-xs font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-neutral-200 dark:border-neutral-700 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{lang === 'ar' ? 'جارٍ الاتصال بسوبابيز...' : 'Connecting to Supabase...'}</span>
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
      <div className="w-full max-w-sm sm:max-w-md mx-auto text-center text-[11px] text-neutral-400 font-medium py-3">
        <span>BlinkFarms — NASA Space Apps Challenge 2026</span>
      </div>
    </main>
  );
}
