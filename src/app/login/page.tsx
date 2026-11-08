'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Language } from '@/lib/types';
import { UserProfile } from '@/components/AuthGateway';

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('ar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('blinkfarms_lang') as Language;
    if (savedLang) setLang(savedLang);
    
    // Check if already logged in
    const savedUser = localStorage.getItem('blinkfarms_auth_user');
    if (savedUser) {
      router.replace('/');
    }
  }, [router]);

  const toggleLang = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    localStorage.setItem('blinkfarms_lang', nextLang);
    document.documentElement.lang = nextLang;
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
  };

  const handleSuccessfulAuth = (user: UserProfile) => {
    localStorage.setItem('blinkfarms_auth_user', JSON.stringify(user));
    router.push('/');
  };

  const handleDemoLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const user: UserProfile = {
        id: 'u_demo',
        name: lang === 'ar' ? 'م. محمود الشربيني' : 'M. Sherbini',
        email: 'farmer@blinkfarms.eg',
        role: 'farmer',
      };
      handleSuccessfulAuth(user);
    }, 400);
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const user: UserProfile = {
        id: 'u_google',
        name: lang === 'ar' ? 'مزارع تجريبي (Google)' : 'Verified Farmer (Google)',
        email: 'farmer.demo@gmail.com',
        role: 'farmer',
      };
      handleSuccessfulAuth(user);
    }, 600);
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
    }, 500);
  };

  return (
    <main className="min-h-screen w-full bg-[#F5F5F7] dark:bg-black flex flex-col justify-between p-4 sm:p-6 animate-fadeIn">
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
              ? 'سجّل دخولك لحفظ بيانات أرضك وتاريخ ذاكرة الحقل'
              : 'Log in to securely link your field memory and crop records'}
          </p>
        </div>

        {/* Quick Demo Access Button (Clean Farmer Demo) */}
        <button
          onClick={handleDemoLogin}
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <span>🌱</span>
          <span>{lang === 'ar' ? 'دخول سريع بحساب مزارع تجريبي' : 'Quick Demo Farmer Access'}</span>
        </button>

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{lang === 'ar' ? 'المتابعة عبر حساب Google' : 'Continue with Google'}</span>
        </button>

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
              ? (lang === 'ar' ? 'إنشاء حساب جديد' : 'Create Account')
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
