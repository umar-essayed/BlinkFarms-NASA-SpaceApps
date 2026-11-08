'use client';

import React, { useState } from 'react';
import { Language } from '@/lib/types';

interface OnboardingStoryProps {
  lang: Language;
  onFinish: () => void;
}

export default function OnboardingStory({ lang, onFinish }: OnboardingStoryProps) {
  const [slide, setSlide] = useState(0);

  const SLIDES_AR = [
    {
      badge: 'الابتكار الأول عالمياً',
      icon: '⏱️',
      title: 'كشف الجفاف قبل اصفرار الأوراق بـ 14 يوماً!',
      subtitle: 'لماذا تفشل الكاميرات البصرية ومؤشر الخضار (NDVI)؟',
      desc: 'حين يعطش الحقل، يظل أخضر لأكثر من أسبوعين بينما تتلف أوعية النبات من الداخل. رادار BlinkFarms يقيس حرارة مسام الأوراق بالأشعة تحت الحمراء من مراصد ناسا (ECOSTRESS) ويكتشف انقطاع النتح في نفس اليوم!',
      stat: '14 - 28 يوماً',
      statLabel: 'ميزة إنذار مبكر لإنقاذ المحصول قبل فوات الأوان',
      gradient: 'from-blue-600 to-indigo-700',
    },
    {
      badge: 'ذكاء باطن الأرض',
      icon: '🔄',
      title: 'ذاكرة الحقل (F_state) واستكشاف التربة بدون مجسات',
      subtitle: 'لا نعامل الأرض كصفحة بيضاء، بل ككائن حي له تاريخ',
      desc: 'عبر المسبار العكسي للري وبيانات ناسا لـ 10 سنوات، يكتشف النظام كتمة باطن التربة (Hardpan) وطبقات التمليح واستنزاف النيتروجين بدقة 30 متراً من الفضاء دون الحاجة لحساسات أرضية مكلفة.',
      stat: '30 متراً',
      statLabel: 'دقة رصد فضائي ببيانات تاريخية تراكمية',
      gradient: 'from-emerald-600 to-teal-700',
    },
    {
      badge: 'تكييف المزارع',
      icon: '🌾',
      title: 'تخطيط الدورات الزراعية لـ 3 سنوات وتوفير 36% مياه',
      subtitle: 'محاكاة 30 سنة مناخ عبر خوارزمية Dynamic TOPSIS',
      desc: 'بناءً على أولوياتك وموقعك الجغرافي، يرشح لك المحرك أفضل تعاقب محصولي ذكي يكسر دورات الآفات، يجدد النيتروجين الحيوي طبيعياً، ويحمي استثماراتك من صدمات تغير المناخ.',
      stat: '-36% مياه',
      statLabel: 'ترشيد استهلاك مع تعظيم الأرباح المالية',
      gradient: 'from-amber-600 to-orange-700',
    },
  ];

  const SLIDES_EN = [
    {
      badge: 'Core Global Innovation',
      icon: '⏱️',
      title: 'Flash Drought Detection 14 Days Ahead of Browning!',
      subtitle: 'Why optical satellites and NDVI deceive farmers?',
      desc: 'Crops look lush green for 2 weeks while internal vascular vessels cavitate. BlinkFarms uses NASA thermal IR (ECOSTRESS) to measure canopy pore fever and stomatal closure on Day 0!',
      stat: '14 - 28 Days',
      statLabel: 'Early warning lead time before irreversible loss',
      gradient: 'from-blue-600 to-indigo-700',
    },
    {
      badge: 'Subsoil Intelligence',
      icon: '🔄',
      title: 'Field Memory (F_state) & Sensorless Diagnostics',
      subtitle: 'Farmland has a past. We diagnose it from orbit.',
      desc: 'Using closed-loop irrigation probing and 10-year NASA Earth observations, the system diagnoses subsoil compaction (Hardpan) and salinity at 30m resolution without costly in-situ ground probes.',
      stat: '30 Meters',
      statLabel: 'Orbital resolution fused with 10-year climate memory',
      gradient: 'from-emerald-600 to-teal-700',
    },
    {
      badge: 'Adaptive Resilience',
      icon: '🌾',
      title: '3-Year Multi-Season Rotation & 36% Water Savings',
      subtitle: 'Simulating 30 years of weather via Dynamic TOPSIS',
      desc: 'Aligned with your priorities and agro-ecological climate, the engine crafts an optimal 3-year succession that restores biological nitrogen, disrupts pests, and secures net margins.',
      stat: '-36% Water',
      statLabel: 'Average irrigation reduction with higher yields',
      gradient: 'from-amber-600 to-orange-700',
    },
  ];

  const slides = lang === 'ar' ? SLIDES_AR : SLIDES_EN;
  const cur = slides[slide];
  const isLast = slide === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      onFinish();
    } else {
      setSlide(slide + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[4000] bg-black flex flex-col justify-between p-4 sm:p-8 animate-fadeIn text-white overflow-hidden">
      {/* Top Progress Bars (Instagram / Stories style) */}
      <div className="flex items-center justify-between gap-2 max-w-xl mx-auto w-full pt-2">
        <div className="flex items-center gap-1.5 flex-1">
          {slides.map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden"
            >
              <div
                className={`h-full bg-white transition-all duration-300 ${
                  i < slide ? 'w-full' : (i === slide ? 'w-full' : 'w-0')
                }`}
              />
            </div>
          ))}
        </div>

        <button
          onClick={onFinish}
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all active:scale-95"
        >
          {lang === 'ar' ? 'تخطي ✕' : 'Skip ✕'}
        </button>
      </div>

      {/* Main Slide Content */}
      <div className="max-w-xl mx-auto w-full my-auto space-y-6 text-center py-6">
        <div className="flex items-center justify-center gap-2 mb-1">
          <img
            src="/logo.png"
            alt="BlinkFarms"
            className="w-12 h-12 object-contain drop-shadow-lg"
          />
          <span className="text-lg font-black tracking-tight text-white">BlinkFarms</span>
        </div>

        <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-4xl sm:text-5xl shadow-2xl">
          {cur.icon}
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/15 text-blue-200">
            {cur.badge}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            {cur.title}
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-blue-200">
            {cur.subtitle}
          </p>
        </div>

        <p className="text-xs sm:text-sm text-white/80 leading-relaxed max-w-lg mx-auto">
          {cur.desc}
        </p>

        {/* Big Highlight Stat Box */}
        <div className={`p-4 rounded-3xl bg-gradient-to-r ${cur.gradient} border border-white/20 shadow-xl max-w-md mx-auto`}>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white">
            {cur.stat}
          </div>
          <div className="text-xs text-white/80 font-medium mt-0.5">
            {cur.statLabel}
          </div>
        </div>
      </div>

      {/* Bottom Button Bar */}
      <div className="max-w-xl mx-auto w-full flex items-center justify-between gap-4 pb-4">
        {slide > 0 ? (
          <button
            onClick={() => setSlide(slide - 1)}
            className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all active:scale-95"
          >
            {lang === 'ar' ? 'السابق' : 'Back'}
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={handleNext}
          className="px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm shadow-xl active:scale-95 transition-all flex items-center gap-2"
        >
          <span>{isLast ? (lang === 'ar' ? 'ابدأ الاستخدام الآن 🚀' : 'Start Journey 🚀') : (lang === 'ar' ? 'التالي ➔' : 'Next ➔')}</span>
        </button>
      </div>
    </div>
  );
}
