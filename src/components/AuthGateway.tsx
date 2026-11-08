'use client';

import React, { useState } from 'react';
import { Language } from '@/lib/types';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'farmer' | 'evaluator';
  avatar?: string;
}

interface AuthGatewayProps {
  lang: Language;
  onLoginSuccess: (user: UserProfile) => void;
  onSkip?: () => void;
}

export default function AuthGateway({ lang, onLoginSuccess, onSkip }: AuthGatewayProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fast One-Click Demo Mode for NASA Space Apps Judges
  const handleFastDemoLogin = () => {
    const demoUser: UserProfile = {
      id: 'demo_judge_1',
      name: lang === 'ar' ? 'م. محمود الشربيني (محكم / مستشار زراعي)' : 'Dr. M. Sherbini (NASA Space Apps Judge)',
      email: 'judge@spaceappschallenge.org',
      role: 'evaluator',
    };
    localStorage.setItem('blinkfarms_auth_user', JSON.stringify(demoUser));
    onLoginSuccess(demoUser);
  };

  // Google OAuth Mock / Live
  const handleGoogleLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      const googleUser: UserProfile = {
        id: `g_${Date.now()}`,
        name: lang === 'ar' ? 'مستخدم Google الزراعي' : 'Google Verified Farmer',
        email: 'farmer.nasa@gmail.com',
        role: 'farmer',
      };
      localStorage.setItem('blinkfarms_auth_user', JSON.stringify(googleUser));
      setIsLoading(false);
      onLoginSuccess(googleUser);
    }, 600);
  };

  // Email / Password Form Submit
  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);

    setTimeout(() => {
      const user: UserProfile = {
        id: `usr_${Date.now()}`,
        name: name || (lang === 'ar' ? 'مزارع معتمد' : 'Verified Farmer'),
        email,
        role: 'farmer',
      };
      localStorage.setItem('blinkfarms_auth_user', JSON.stringify(user));
      setIsLoading(false);
      onLoginSuccess(user);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[3500] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-black/10 dark:border-white/10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <img
            src="/logo.png"
            alt="BlinkFarms"
            className="w-16 h-16 mx-auto object-contain drop-shadow-md"
          />
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            {lang === 'ar' ? 'بوابة المزارعين والمحكّمين' : 'BlinkFarms Portal Gateway'}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {lang === 'ar'
              ? 'سجّل دخولك لحفظ بيانات أرضك وتاريخ ذاكرة الحقل لـ 10 سنوات'
              : 'Log in to securely link your 10-year NASA field memory and crop records'}
          </p>
        </div>

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-black/5 dark:border-white/10 text-neutral-800 dark:text-neutral-200 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
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
          {isSignUp && (
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang === 'ar' ? 'اسم المزارع أو المهندس' : 'Full Name'}
              className="w-full px-4 py-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          )}

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
            className="w-full px-4 py-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />

          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={lang === 'ar' ? 'كلمة المرور' : 'Password'}
            className="w-full px-4 py-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-2xl bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black font-bold text-xs sm:text-sm transition-all active:scale-95 shadow-md"
          >
            {isLoading
              ? (lang === 'ar' ? 'جارٍ التحقق...' : 'Authenticating...')
              : isSignUp
              ? (lang === 'ar' ? 'إنشاء حساب جديد' : 'Create Account')
              : (lang === 'ar' ? 'تسجيل الدخول' : 'Sign In')}
          </button>
        </form>

        {/* Bottom Toggle + Skip */}
        <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-black/5 dark:border-white/5">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="hover:text-blue-600 font-semibold"
          >
            {isSignUp
              ? (lang === 'ar' ? 'لديك حساب بالفعل؟ سجل دخول' : 'Already have an account? Sign in')
              : (lang === 'ar' ? 'ليس لديك حساب؟ سجل الآن' : 'New farmer? Sign up')}
          </button>

          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              {lang === 'ar' ? 'تخطي كزائر ➔' : 'Skip as Guest ➔'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
