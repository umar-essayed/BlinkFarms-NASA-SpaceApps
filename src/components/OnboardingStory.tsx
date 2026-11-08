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
      title: 'ذاكرة الحقل واستكشاف التربة بدون مجسات',
      subtitle: 'لا نعامل الأرض كصفحة بيضاء، بل ككائن حي له تاريخ',
      desc: 'عبر المسبار العكسي للري وبيانات ناسا لـ 10 سنوات، يكتشف النظام كتمة باطن التربة (Hardpan) وطبقات التمليح واستنزاف النيتروجين بدقة 30 متراً من الفضاء دون الحاجة لحساسات أرضية مكلفة.',
      stat: '30 متراً',
      statLabel: 'دقة رصد فضائي ببيانات تاريخية تراكمية',
      gradient: 'from-emerald-600 to-teal-700',
    },
    {
      badge: 'تكييف المزارع',
      icon: '🌾',
      title: 'تخطيط الدورات الزراعية وتوفير 36% مياه',
      subtitle: 'محاكاة 30 سنة مناخ عبر خوارزمية Dynamic TOPSIS',
      desc: 'بناءً على أولوياتك وموقعك الجغرافي، يرشح لك المحرك أفضل تعاقب محصولي ذكي يكسر دورات الآفات، يجدد النيتروجين الحيوي طبيعياً، ويحمي استثماراتك من صدمات تغير المناخ.',
      stat: '-36% مياه',
      statLabel: 'ترشيد استهلاك مع تعظيم الأرباح المالية',
      gradient: 'from-amber-600 to-orange-700',
    },
    {
      badge: 'المرشد الصوتي التفاعلي',
      icon: '🤖',
      logoImg: '/blink-ai-logo.png',
      title: 'BlinkAI — مرشدك الزراعي الذكي بالصوت',
      subtitle: 'تحدث معه بالبلدي واستشره في ري أرضك ودورتك',
      desc: 'مدعوم بنظام صوتي حي مرتبط مباشرة بذاكرة الحقل وأرصاد ناسا الفضائية. اضغط على المايك وتحدث معه بصوتك كأنك تستشير خبيراً زراعياً يقف معك في قلب الغيط!',
      stat: 'Live Voice',
      statLabel: 'محادثة صوتية ذكية تفاعلية وتفريغ نصي دائم',
      gradient: 'from-emerald-600 to-teal-700',
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
      title: 'Field Memory & Sensorless Diagnostics',
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
    {
      badge: 'Live Voice Copilot',
      icon: '🤖',
      logoImg: '/blink-ai-logo.png',
      title: 'BlinkAI — Your Voice Agricultural Copilot',
      subtitle: 'Speak naturally to analyze crops and irrigation',
      desc: 'Coupled directly with NASA Earth telemetry and field history. Tap the microphone and have real-time live conversations with your AI agronomist anywhere in the field!',
      stat: 'Live Voice',
      statLabel: 'Real-time conversational agricultural intelligence',
      gradient: 'from-emerald-600 to-teal-700',
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
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-black flex flex-col justify-between p-3.5 sm:p-6 text-white overflow-hidden select-none font-sans">
      {/* Top Progress Bars */}
      <div className="flex items-center justify-between gap-3 max-w-md mx-auto w-full pt-1 shrink-0">
        <div className="flex items-center gap-1.5 flex-1">
          {slides.map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden"
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
          className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 active:scale-95 transition-all"
        >
          {lang === 'ar' ? 'تخطي ✕' : 'Skip ✕'}
        </button>
      </div>

      {/* Main Slide Content (Compact One-Screen layout) */}
      <div className="max-w-md mx-auto w-full my-auto space-y-3 sm:space-y-4 text-center py-2 shrink-0">
        <div className="flex items-center justify-center gap-2">
          <img
            src="/logo.png"
            alt="BlinkFarms"
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow-md"
          />
          <span className="text-sm sm:text-base font-black tracking-tight text-white">BlinkFarms</span>
          <span className="text-white/40">×</span>
          <img
            src="/blink-ai-logo.png"
            alt="BlinkAI"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-emerald-500/50 shadow-sm"
          />
          <span className="text-sm sm:text-base font-black tracking-tight text-emerald-400">BlinkAI</span>
        </div>

        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-3xl sm:text-4xl shadow-xl overflow-hidden p-1">
          {(cur as any).logoImg ? (
            <img
              src={(cur as any).logoImg}
              alt="BlinkAI"
              className="w-full h-full rounded-xl object-cover shadow-inner"
            />
          ) : (
            cur.icon
          )}
        </div>

        <div className="space-y-1 sm:space-y-1.5">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/15 text-blue-200">
            {cur.badge}
          </span>
          <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-snug px-2">
            {cur.title}
          </h2>
          <p className="text-[11px] sm:text-xs font-semibold text-blue-200/90">
            {cur.subtitle}
          </p>
        </div>

        <p className="text-[11px] sm:text-xs text-white/75 leading-relaxed max-w-sm mx-auto px-2">
          {cur.desc}
        </p>

        {/* Highlight Stat Box */}
        <div className={`py-2 px-4 rounded-2xl bg-gradient-to-r ${cur.gradient} border border-white/20 shadow-lg max-w-xs mx-auto`}>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            {cur.stat}
          </div>
          <div className="text-[10px] sm:text-[11px] text-white/80 font-medium">
            {cur.statLabel}
          </div>
        </div>
      </div>

      {/* Bottom Button Bar */}
      <div className="max-w-md mx-auto w-full flex items-center justify-between gap-3 pb-2 shrink-0">
        {slide > 0 ? (
          <button
            onClick={() => setSlide(slide - 1)}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all active:scale-95"
          >
            {lang === 'ar' ? 'السابق' : 'Back'}
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={handleNext}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
        >
          <span>{isLast ? (lang === 'ar' ? 'ابدأ الاستخدام 🚀' : 'Start Journey 🚀') : (lang === 'ar' ? 'التالي ➔' : 'Next ➔')}</span>
        </button>
      </div>
    </div>
  );
}
