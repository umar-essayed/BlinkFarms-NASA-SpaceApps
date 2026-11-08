'use client';

import React, { useState, useEffect } from 'react';
import { Language } from '@/lib/types';

interface PwaInstallPromptProps {
  lang: Language;
}

export default function PwaInstallPrompt({ lang }: PwaInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isInsecureOrigin, setIsInsecureOrigin] = useState(false);

  useEffect(() => {
    // 1. Check if already running in standalone mode (already installed as PWA)
    const isApp =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isApp);

    // 2. Check if iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // 3. Check if insecure non-localhost origin
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    if (!isLocalhost && window.location.protocol !== 'https:') {
      setIsInsecureOrigin(true);
    }

    // 4. Capture beforeinstallprompt event for Chromium browsers
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn('Error invoking install prompt:', err);
        setShowGuideModal(true);
      }
    } else {
      // If deferredPrompt is null (e.g. iOS, Safari, or Chrome on non-HTTPS local IP), show friendly guide
      setShowGuideModal(true);
    }
  };

  // If already running inside installed standalone PWA, hide install button
  if (isStandalone) return null;

  return (
    <>
      {/* Prominent PWA Install Pill Button */}
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-emerald-600/30 active:scale-95 transition-all shrink-0 border border-emerald-400/40"
        title={lang === 'ar' ? 'تثبيت تطبيق BlinkAI على هاتفك' : 'Install BlinkAI App'}
      >
        <img
          src="/blink-ai-logo.png"
          alt="BlinkAI"
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full object-cover border border-white/40"
        />
        <span>{lang === 'ar' ? '📲 تثبيت التطبيق' : '📲 Install App'}</span>
      </button>

      {/* Universal Step-by-Step PWA Installation Guide Modal */}
      {showGuideModal && (
        <div
          onClick={() => setShowGuideModal(false)}
          className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3.5 sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            className="w-full max-w-sm bg-[#121216] border border-white/10 rounded-3xl p-5 text-white space-y-4 shadow-2xl text-center"
          >
            <img
              src="/blink-ai-logo.png"
              alt="BlinkAI"
              className="w-14 h-14 mx-auto rounded-full object-cover border-2 border-emerald-500/60 shadow-lg"
            />

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">
                {lang === 'ar' ? 'تثبيت تطبيق BlinkAI' : 'Install BlinkAI App'}
              </h3>
              <p className="text-xs text-neutral-400">
                {lang === 'ar'
                  ? 'يعمل كتطبيق مستقل بدون الحاجة لمتجر تطبيقات:'
                  : 'Runs as a standalone web application without app store:'}
              </p>
            </div>

            {/* Platform-specific instructions */}
            <div className="space-y-2.5 text-xs text-neutral-200 text-right bg-white/5 p-3.5 rounded-2xl border border-white/5">
              {isIos ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                      1
                    </span>
                    <span>
                      {lang === 'ar'
                        ? 'اضغط على زر المشاركة (Share) ⎋ في متصفح سفاري أسفل الشاشة.'
                        : 'Tap the Share icon ⎋ at the bottom of Safari.'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                      2
                    </span>
                    <span>
                      {lang === 'ar'
                        ? 'مرر للأسفل واختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen ＋).'
                        : 'Scroll and select "Add to Home Screen ＋".'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                      1
                    </span>
                    <span>
                      {lang === 'ar'
                        ? 'اضغط على قائمة الثلاث نقاط (⋮) في أعلى متصفح Chrome أو Edge.'
                        : 'Tap the three-dots menu (⋮) in Chrome or Edge.'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                      2
                    </span>
                    <span>
                      {lang === 'ar'
                        ? 'اختر "تثبيت التطبيق" (Install app) أو "إضافة إلى الشاشة الرئيسية".'
                        : 'Select "Install app" or "Add to Home screen".'}
                    </span>
                  </div>
                  {isInsecureOrigin && (
                    <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-amber-300 leading-normal">
                      {lang === 'ar'
                        ? '⚠️ ملاحظة: عند الفتح عبر IP محلي (غير HTTPS)، يتطلب أمان Chrome تفعيل خيار الأمان في: chrome://flags/#unsafely-treat-insecure-origin-as-secure وإضافة الرابط.'
                        : '⚠️ Note: Over local IP (non-HTTPS), Chrome requires enabling chrome://flags/#unsafely-treat-insecure-origin-as-secure with your IP URL.'}
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all shadow-md active:scale-95"
            >
              {lang === 'ar' ? 'فهمت، شكراً' : 'Got it, Thanks'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
