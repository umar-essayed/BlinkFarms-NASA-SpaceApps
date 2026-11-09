'use client';

import React from 'react';
import { Language, FlashDroughtTelemetry, UnifiedFarmVitals } from '@/lib/types';
import ProvenanceBadge from './ProvenanceBadge';

interface DroughtThreatGaugeProps {
  telemetry: FlashDroughtTelemetry;
  vitals?: UnifiedFarmVitals;
  lang: Language;
  onQuickIrrigateClick?: () => void;
}

export default function DroughtThreatGauge({
  telemetry,
  vitals,
  lang,
  onQuickIrrigateClick,
}: DroughtThreatGaugeProps) {
  // Determine threat level from unified vitals or telemetry
  const level = vitals?.flashDroughtThreat.level ?? (telemetry.isFlashDroughtAlert || telemetry.canopyTempAnomalyC >= 2.5 ? 3 : (telemetry.canopyTempAnomalyC > 1.0 || telemetry.currentESI < 0.70 ? 2 : 1));
  const isAlert = level === 3;
  const isWatch = level === 2;

  const deltaT = vitals?.temperature.deltaTC ?? telemetry.canopyTempAnomalyC;
  const esiVal = vitals?.hydrology.evaporativeStressIndex ?? telemetry.currentESI;
  const ndviVal = vitals?.flashDroughtThreat.currentNDVI ?? telemetry.currentNDVI;

  const getStatusText = () => {
    if (lang === 'ar') {
      if (level === 3) return '🚨 إنذار جفاف ومضي نشط (حمى مسام المحصول)';
      if (level === 2) return '⚠️ إجهاد حراري تحت المراقبة (بداية تباطؤ النتح)';
      return '🟢 ترطيب مثالي وتبريد نتحي طبيعي';
    }
    if (level === 3) return '🚨 Acute Flash Drought Shock (Canopy Fever)';
    if (level === 2) return '⚠️ Early Thermal Stress Watch (Transpiration Slowing)';
    return '🟢 Optimal Hydration & Natural Transpirational Cooling';
  };

  const getStatusDescription = () => {
    if (vitals?.flashDroughtThreat.warningNarrativeAr && lang === 'ar') {
      return vitals.flashDroughtThreat.warningNarrativeAr;
    }
    if (vitals?.flashDroughtThreat.warningNarrativeEn && lang === 'en') {
      return vitals.flashDroughtThreat.warningNarrativeEn;
    }
    if (lang === 'ar') {
      if (level === 3) {
        return `المسام أغلقت تماماً لحبس المياه مما سبب حمى حرارية في أوراق النبات (+${deltaT.toFixed(1)}°م). الري اليوم يمنع اصفرار الأوراق وتلف المحصول المتوقع بعد 14 يوماً.`;
      }
      if (level === 2) {
        return `بداية ارتفاع طفيف في حرارة الأوراق (+${deltaT.toFixed(1)}°م) مع تناقص مخزون رطوبة الجذور. النبات ما زال يبرد نفسه لكنه يقترب من حد العطش؛ راقب الري خلال 48 ساعة.`;
      }
      return 'الأوراق مبردة ذاتياً والمسامات مفتوحة تضخ المياه بسلاسة. رطوبة منطقة الجذور وفيرة ولا يوجد أي مؤشر لخطر الجفاف.';
    }
    if (level === 3) {
      return `Canopy fever active (+${deltaT.toFixed(1)}°C) with stomata clamped shut. Quenching today prevents irreversible leaf yellowing manifesting in 14 days.`;
    }
    if (level === 2) {
      return `Mild canopy warming (+${deltaT.toFixed(1)}°C) and descending root moisture. Transpiration is slowing; ensure irrigation is delivered within 48 hours.`;
    }
    return 'Stomata are open with healthy transpirational cooling. Root-zone moisture is sufficient and balanced.';
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md shadow-sm border border-black/5 dark:border-white/10 space-y-4">
      {/* Header with Title and Provenance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 dark:border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${
              level === 3
                ? 'bg-rose-500/15 text-rose-600 animate-pulse'
                : level === 2
                ? 'bg-amber-500/15 text-amber-500'
                : 'bg-emerald-500/15 text-emerald-600'
            }`}
          >
            {level === 3 ? '🔥' : level === 2 ? '⚠️' : '💧'}
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>{lang === 'ar' ? 'رادار الإنذار المبكر للجفاف الومضي والصمود المائي' : 'Flash Drought Early Warning Radar'}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold">
                14-DAY LEAD TIME
              </span>
            </h3>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {lang === 'ar'
                ? 'رصد حمى الأوراق تحت الحمراء (ECOSTRESS) ورطوبة القاع (SMAP 30m) قبل أي اصفرار بصري'
                : 'Synthesized from ECOSTRESS thermal infrared & SMAP 30m root moisture'}
            </span>
          </div>
        </div>

        <ProvenanceBadge
          state="LIVE"
          source="ECOSTRESS + SMAP + HLS"
          resolution="70m - 30m"
          lang={lang}
        />
      </div>

      {/* Main Visual Threat Level Bar */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-extrabold text-neutral-800 dark:text-neutral-200">
            {getStatusText()}
          </span>
          <span className="text-xs font-mono font-bold text-neutral-400">
            {lang === 'ar' ? `المستوى: ${level} من 3` : `Level: ${level} / 3`}
          </span>
        </div>

        {/* 3-Stage Progress Gauge Bar */}
        <div className="w-full h-3.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden flex gap-1 p-0.5">
          <div
            className={`flex-1 rounded-full transition-all duration-700 ${
              level >= 1 ? 'bg-emerald-500 shadow-sm' : 'bg-transparent opacity-20'
            }`}
            title="1. ترطيب طبيعي"
          />
          <div
            className={`flex-1 rounded-full transition-all duration-700 ${
              level >= 2 ? 'bg-amber-400 shadow-sm' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
            title="2. إجهاد مبكر"
          />
          <div
            className={`flex-1 rounded-full transition-all duration-700 ${
              level >= 3 ? 'bg-rose-500 shadow-sm animate-pulse' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
            title="3. إنذار جفاف نشط"
          />
        </div>

        <div className="flex justify-between text-[11px] font-bold text-neutral-400 px-1">
          <span className={level === 1 ? 'text-emerald-600 font-extrabold' : ''}>
            {lang === 'ar' ? '1. ترطيب طبيعي 🟢' : '1. Optimal 🟢'}
          </span>
          <span className={level === 2 ? 'text-amber-500 font-extrabold' : ''}>
            {lang === 'ar' ? '2. إجهاد مبكر 🟡' : '2. Stress Watch 🟡'}
          </span>
          <span className={level === 3 ? 'text-rose-600 font-extrabold' : ''}>
            {lang === 'ar' ? '3. جفاف ومضي نشط 🔴' : '3. Flash Drought 🔴'}
          </span>
        </div>
      </div>

      {/* Narrative Explanation Box */}
      <div
        className={`p-4 rounded-2xl text-xs font-medium leading-relaxed ${
          level === 3
            ? 'bg-rose-500/10 text-rose-900 dark:text-rose-200 border border-rose-500/20'
            : level === 2
            ? 'bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/20'
            : 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border border-emerald-500/20'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <span className="text-base shrink-0 mt-0.5">💡</span>
          <div className="space-y-1">
            <span className="font-extrabold block text-xs sm:text-sm">
              {lang === 'ar' ? 'التشخيص الزراعي الفوري لحقلك:' : 'Real-Time Agronomic Diagnosis:'}
            </span>
            <p>{getStatusDescription()}</p>
          </div>
        </div>
      </div>

      {/* The 14-Day Early Warning Advantage Box (Why ESI Beats Optical NDVI) */}
      <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#16161C] border border-black/5 dark:border-white/5 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-extrabold text-neutral-900 dark:text-white">
          <div className="flex items-center gap-2">
            <span>⏱️</span>
            <span>
              {lang === 'ar'
                ? 'السبق العلمي لـ BlinkFarms: رصد العطش قبل اصفرار الأوراق بـ 14 يوماً'
                : 'Scientific Lead Time: Detecting Stress 14 Days Ahead of Leaf Yellowing'}
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
            ECOSTRESS vs NDVI
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-white/70 dark:bg-black/30 border border-black/5 dark:border-white/5 space-y-1">
            <span className="text-neutral-400 font-bold block text-[11px]">
              {lang === 'ar' ? '1. مؤشر الإجهاد التبخري (ESI)' : '1. Evaporative Stress (ESI)'}
            </span>
            <div className="text-lg font-black font-mono text-neutral-900 dark:text-white">
              {esiVal.toFixed(2)}
            </div>
            <p className="text-[10px] text-neutral-500">
              {esiVal >= 0.70
                ? (lang === 'ar' ? 'المسام مفتوحة تفرز رطوبة النتح' : 'Stomata open, transpirational cooling active')
                : (lang === 'ar' ? 'إغلاق نتحي فوري لحبس الماء' : 'Stomata clamped to prevent desiccation')}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/70 dark:bg-black/30 border border-black/5 dark:border-white/5 space-y-1">
            <span className="text-neutral-400 font-bold block text-[11px]">
              {lang === 'ar' ? '2. الخضار البصري بالأقمار (NDVI)' : '2. Optical Greenness (NDVI)'}
            </span>
            <div className="text-lg font-black font-mono text-emerald-600">
              {ndviVal.toFixed(2)}
            </div>
            <p className="text-[10px] text-neutral-500">
              {lang === 'ar'
                ? 'ما زال يبدو أخضر بالعين والأقمار العادية (تأخر 14 يوماً)'
                : 'Deceptively green on standard optical satellites (14d lag)'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/70 dark:bg-black/30 border border-black/5 dark:border-white/5 space-y-1">
            <span className="text-neutral-400 font-bold block text-[11px]">
              {lang === 'ar' ? '3. مكسب المزارع الزمني' : '3. Farmer Decision Lead Time'}
            </span>
            <div className="text-lg font-black font-mono text-blue-600">
              {level === 3 ? '+14' : '+30'} {lang === 'ar' ? 'يوماً كسب' : 'days lead'}
            </div>
            <p className="text-[10px] text-neutral-500">
              {lang === 'ar'
                ? 'إمكانية إنقاذ المحصول بالري الفوري قبل فوات الأوان'
                : 'Time window to quench parcel before irreversible cell collapse'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
