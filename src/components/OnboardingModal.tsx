'use client';

import React, { useState, useEffect } from 'react';
import { Language } from '@/lib/types';
import { DEMO_FIELDS, FieldPreset } from '@/lib/veloceRootEngine';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSelectPreset: (preset: FieldPreset) => void;
  onLocateMe: () => void;
}

export default function OnboardingModal({
  isOpen,
  onClose,
  lang,
  onSelectPreset,
  onLocateMe,
}: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const STEPS_AR = [
    {
      badge: 'مرحباً بك في المنظومة',
      icon: '🛰️',
      title: 'BlinkFarms — مستقبل الزراعة الذكية',
      desc: 'منظومة فيزيائية متقدمة مبنية لتحدي NASA Space Apps 2026. تجمع بين مراصد ناسا الفضائية (ECOSTRESS و SMAP) والنمذجة الحيوية لتكييف المزارع مع تغير المناخ وحماية المحاصيل.',
      highlight: 'رصد لحظي فوري بدقة 30 متراً دون الحاجة لحساسات أرضية مكلفة.',
    },
    {
      badge: 'سر الابتكار العالمي',
      icon: '⏱️',
      title: 'كشف الجفاف قبل اصفرار الأوراق بـ 14 يوماً',
      desc: 'الكاميرات العادية ومؤشرات الخضار (NDVI) تخدع العين؛ يظل الحقل أخضر لمدة أسبوعين بعد موت الأوعية. نظامنا يقيس حرارة مسام النبات بالأشعة تحت الحمراء، ويكتشف "الحمّى النباتية" وانقطاع النتح في نفس اليوم!',
      highlight: 'إنقاذ المحصول قبل فوات الأوان وتحديد كمية الري الدقيقة بالفدان.',
    },
    {
      badge: 'ذاكرة الأرض والدورات',
      icon: '🔄',
      title: 'ذاكرة الحقل والتخطيط لـ 3 سنوات',
      desc: 'النظام يحتفظ بذاكرة الحقل (F_state) ليكتشف كتمة باطن التربة والملوحة عبر المسبار العكسي، ويحاكي أفضل دورة زراعية متعاقبة توفر 36% من المياه وتجدد النيتروجين.',
      highlight: 'تجديد النيتروجين الطبيعي، كسر دورات الآفات، وزيادة الأرباح.',
    },
    {
      badge: 'Blink AI — المرشد الصوتي',
      icon: '🤖',
      logoImg: '/blink-ai-logo.png',
      title: 'Blink AI — استشر مرشدك الزراعي بالصوت',
      desc: 'بجانب الخرائط والمؤشرات، يمكنك التحدث مباشرة مع "Blink AI" بصوتك بالبلدي وسؤاله عن الري ومشاكل المحصول، وسيرد عليك صوتياً في جزء من الثانية مع حفظ كل كلمة في سجلك.',
      highlight: 'شات صوتي وتفريغ نصي فوري مدعوم بموديل Groq 120B وأرصاد ناسا.',
    },
    {
      badge: 'ابدأ الآن',
      icon: '📍',
      title: 'اختر موقع حقلك للبدء',
      desc: 'اختر إحدى المزارع المرجعية الجاهزة للفحص الفوري، أو استخدم ميزة تحديد موقعك الحالي بالـ GPS في أي مكان في العالم.',
      highlight: 'اضغط على أي مزرعة للانطلاق فوراً إلى لوحة القيادة.',
    },
  ];

  const STEPS_EN = [
    {
      badge: 'Welcome to the System',
      icon: '🛰️',
      title: 'BlinkFarms — Resilient Agriculture',
      desc: 'Advanced biophysical platform built for NASA Space Apps 2026. Merging NASA Earth observations (ECOSTRESS & SMAP) with biophysical modeling to adapt farms to climate pressures.',
      highlight: 'Instant 30m resolution monitoring without costly in-situ ground sensors.',
    },
    {
      badge: 'Core Global Innovation',
      icon: '⏱️',
      title: 'Flash Drought Detection 14 Days Ahead',
      desc: 'Traditional optical vegetation indices (NDVI) deceive you; crops stay green for weeks while vessels cavitate. We measure canopy pore heat in thermal IR, detecting "Canopy Fever" on Day 0!',
      highlight: 'Quenches drought before crop failure and prescribes precise water volume.',
    },
    {
      badge: 'Soil Memory & 3-Year Plan',
      icon: '🔄',
      title: 'Field Memory & 3-Year Adaptive Rotation',
      desc: 'The system tracks Field Memory (F_state) to diagnose subsoil hardpans and salinity, recommending a 3-year rotation saving 36% water while replenishing organic nitrogen.',
      highlight: 'Replenishes biological nitrogen, interrupts pests, and secures margins.',
    },
    {
      badge: 'Blink AI — Live Voice',
      icon: '🤖',
      logoImg: '/blink-ai-logo.png',
      title: 'Blink AI — Your Voice Agricultural Copilot',
      desc: 'Speak directly with Blink AI using your voice. Ask about irrigation, soil compaction, or crop sequences, and receive spoken guidance in real time auto-saved to your chat logs.',
      highlight: 'Live interactive voice chat powered by Groq 120B and NASA Earth observations.',
    },
    {
      badge: 'Get Started',
      icon: '📍',
      title: 'Select Your Farm to Begin',
      desc: 'Choose one of our reference benchmark parcels or use GPS to locate your own field anywhere on Earth.',
      highlight: 'Select a parcel below to launch your interactive command center.',
    },
  ];

  const steps = lang === 'ar' ? STEPS_AR : STEPS_EN;
  const current = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-black/10 dark:border-white/10 flex flex-col max-h-[88dvh] sm:max-h-[85vh] overflow-hidden">
        {/* Top Header: Progress Dots + Skip Button */}
        <div className="p-4 sm:p-5 pb-3 flex items-center justify-between border-b border-black/5 dark:border-white/5 shrink-0">
          {/* Stepper Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'w-6 bg-blue-600'
                    : 'w-2 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300'
                }`}
                aria-label={`Step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Skip Button */}
          <button
            onClick={onClose}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-all active:scale-95"
          >
            {lang === 'ar' ? 'تخطي ✕' : 'Skip ✕'}
          </button>
        </div>

        {/* Scrollable Slide Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Badge & Icon */}
          <div className="flex items-center gap-2">
            {(current as any).logoImg ? (
              <img
                src={(current as any).logoImg}
                alt="Blink AI"
                className="w-9 h-9 rounded-full object-cover border border-emerald-500/50 shadow-sm"
              />
            ) : (
              <span className="text-2xl sm:text-3xl">{current.icon}</span>
            )}
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              {current.badge}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900 dark:text-white tracking-tight leading-snug">
            {current.title}
          </h2>

          {/* Description */}
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            {current.desc}
          </p>

          {/* Highlight Callout Box */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/40 text-xs font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
            <span>{current.highlight}</span>
          </div>

          {/* If on final step, show quick farm picker in a compact clean list */}
          {isLast && (
            <div className="mt-4 space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
              <span className="text-xs font-bold text-neutral-500 block">
                {lang === 'ar' ? 'اختر حقلاً للبدء:' : 'Choose a reference parcel:'}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEMO_FIELDS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onSelectPreset(preset);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl border border-black/5 dark:border-white/10 hover:border-blue-500 bg-neutral-50 dark:bg-neutral-800/60 hover:bg-blue-50/50 text-start transition-all active:scale-95 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white truncate block">
                        {lang === 'ar' ? preset.nameAr : preset.nameEn}
                      </span>
                      <span className="text-[10px] text-neutral-400 truncate block">
                        {lang === 'ar' ? preset.locationAr : preset.locationEn}
                      </span>
                    </div>
                    <span className="text-xs text-blue-600 font-bold shrink-0">➔</span>
                  </button>
                ))}
              </div>

              {/* GPS Option */}
              <button
                onClick={() => {
                  onLocateMe();
                  onClose();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 mt-2"
              >
                <span>📍</span>
                <span>{lang === 'ar' ? 'أو حدد موقعي الحالي عبر الـ GPS' : 'Or Locate My Field via GPS'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Sticky Bottom Actions Bar */}
        <div className="p-3.5 sm:p-4 border-t border-black/5 dark:border-white/5 bg-neutral-50/90 dark:bg-neutral-900/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          {currentStep > 0 ? (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-4 py-2 rounded-xl bg-neutral-200/70 dark:bg-neutral-800 hover:bg-neutral-300 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-all active:scale-95"
            >
              {lang === 'ar' ? 'السابق' : 'Back'}
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span>{isLast ? (lang === 'ar' ? 'انطلاق إلى المنظومة 🚀' : 'Launch Dashboard 🚀') : (lang === 'ar' ? 'التالي ➔' : 'Next ➔')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
