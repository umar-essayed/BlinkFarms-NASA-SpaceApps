'use client';

import React from 'react';
import { Language, FlashDroughtTelemetry } from '@/lib/types';
import ProvenanceBadge from './ProvenanceBadge';

interface DroughtThreatGaugeProps {
  telemetry: FlashDroughtTelemetry;
  lang: Language;
  onQuickIrrigateClick?: () => void;
}

export default function DroughtThreatGauge({
  telemetry,
  lang,
  onQuickIrrigateClick,
}: DroughtThreatGaugeProps) {
  // Determine threat level:
  // 1: Normal (Canopy anomaly <= 1.0, ESI >= 0.70)
  // 2: Watch / Early Stress (Canopy anomaly 1.1 to 2.4, ESI 0.50 to 0.69)
  // 3: Alert / Flash Drought (Canopy anomaly >= 2.5 or telemetry.isFlashDroughtAlert)
  const isAlert = telemetry.isFlashDroughtAlert || telemetry.canopyTempAnomalyC >= 2.5;
  const isWatch = !isAlert && (telemetry.canopyTempAnomalyC > 1.0 || telemetry.currentESI < 0.70);

  const level = isAlert ? 3 : isWatch ? 2 : 1;

  const getStatusText = () => {
    if (lang === 'ar') {
      if (level === 3) return '🚨 إنذار جفاف ومضي نشط (عطش سريع)';
      if (level === 2) return '⚠️ إجهاد حراري مبكر تحت المراقبة';
      return '🟢 آمن ومستقر تماماً (ترطيب ممتاز)';
    }
    if (level === 3) return '🚨 Acute Flash Drought Shock';
    if (level === 2) return '⚠️ Early Thermal Stress Watch';
    return '🟢 Optimal Hydration & Normal Cooling';
  };

  const getStatusDescription = () => {
    if (lang === 'ar') {
      if (level === 3) {
        return 'عروق النبات عطشانة ومسامات الأوراق أغلقت لحبس المياه مما سبب حمى حرارية (+ ' +
          telemetry.canopyTempAnomalyC.toFixed(1) +
          '°C). إذا لم يتم الري اليوم، سيبدأ المحصول بالاصفرار المفاجئ بعد أسبوعين.';
      }
      if (level === 2) {
        return 'بداية ارتفاع طفيف في حرارة الأوراق مع تناقص رطوبة الأعماق. النبات ما زال يبرد نفسه لكنه يقترب من حد العطش؛ راقب جدول الري خلال 48 ساعة.';
      }
      return 'الأوراق مبردة ذاتياً والمسامات مفتوحة تضخ المياه بسلاسة. رطوبة منطقة الجذور وفيرة ولا يوجد أي مؤشر لخطر الجفاف.';
    }
    if (level === 3) {
      return `Canopy is feverish (+${telemetry.canopyTempAnomalyC.toFixed(1)}°C) with stomata clamped shut. Without immediate watering, visible irreversible yellowing will manifest in 14 days.`;
    }
    if (level === 2) {
      return 'Mild canopy warming and descending subsoil moisture. Transpiration is slowing; ensure irrigation is delivered within 48 hours.';
    }
    return 'Stomata are open with healthy transpirational cooling. Root-zone moisture is sufficient and balanced.';
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-sm border border-black/5 dark:border-white/5 space-y-4">
      {/* Header with Title and Provenance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${
              level === 3
                ? 'bg-red-500/10 text-red-600 animate-pulse'
                : level === 2
                ? 'bg-amber-500/10 text-amber-500'
                : 'bg-emerald-500/10 text-emerald-600'
            }`}
          >
            {level === 3 ? '🔥' : level === 2 ? '⚠️' : '💧'}
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-neutral-900 dark:text-white">
              {lang === 'ar' ? 'مؤشر خطر الجفاف والصمود المائي في الحقل' : 'Real-Time Field Drought Threat Gauge'}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {lang === 'ar' ? 'تحليل لحظي يجمع حرارة الأوراق بالأشعة تحت الحمراء ورطوبة الجذور' : 'Synthesized from ECOSTRESS thermal infrared & SMAP root moisture'}
            </p>
          </div>
        </div>

        <ProvenanceBadge
          state="LIVE"
          source="ECOSTRESS + SMAP"
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
            title="آمن ومستقر"
          />
          <div
            className={`flex-1 rounded-full transition-all duration-700 ${
              level >= 2 ? 'bg-amber-400 shadow-sm' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
            title="إجهاد مبكر"
          />
          <div
            className={`flex-1 rounded-full transition-all duration-700 ${
              level >= 3 ? 'bg-red-500 shadow-sm animate-pulse' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
            title="إنذار جفاف نشط"
          />
        </div>

        <div className="flex justify-between text-[11px] font-bold text-neutral-400 px-1">
          <span className={level === 1 ? 'text-emerald-600 font-extrabold' : ''}>
            {lang === 'ar' ? '1. ترطيب طبيعي' : '1. Optimal'}
          </span>
          <span className={level === 2 ? 'text-amber-500 font-extrabold' : ''}>
            {lang === 'ar' ? '2. إجهاد مبكر' : '2. Stress Watch'}
          </span>
          <span className={level === 3 ? 'text-red-600 font-extrabold' : ''}>
            {lang === 'ar' ? '3. خطر جفاف ومضي' : '3. Flash Drought'}
          </span>
        </div>
      </div>

      {/* Narrative Explanation Box */}
      <div
        className={`p-4 rounded-2xl text-xs font-medium leading-relaxed ${
          level === 3
            ? 'bg-red-500/10 text-red-900 dark:text-red-200 border border-red-500/20'
            : level === 2
            ? 'bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/20'
            : 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border border-emerald-500/20'
        }`}
      >
        <div className="flex items-start gap-2">
          <span className="text-sm shrink-0 mt-0.5">💡</span>
          <div className="space-y-1">
            <span className="font-bold block">
              {lang === 'ar' ? 'ماذا يعني هذا لحقلك الآن؟' : 'What this means for your field right now:'}
            </span>
            <p>{getStatusDescription()}</p>
          </div>
        </div>
      </div>

      {/* 4 Real-Time Diagnostic Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {/* Metric 1: Canopy Fever Anomaly */}
        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 flex flex-col justify-between">
          <span className="text-[11px] text-neutral-400 font-bold">
            {lang === 'ar' ? 'حمى حرارة الأوراق' : 'Canopy Fever Anomaly'}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-xl font-black font-mono ${
                telemetry.canopyTempAnomalyC > 2.0
                  ? 'text-red-600'
                  : telemetry.canopyTempAnomalyC > 0.8
                  ? 'text-amber-500'
                  : 'text-emerald-600'
              }`}
            >
              +{telemetry.canopyTempAnomalyC.toFixed(1)}°C
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 mt-0.5">
            {telemetry.canopyTempAnomalyC > 2.0
              ? (lang === 'ar' ? 'حمى حرارية خطيرة' : 'Severe fever')
              : (lang === 'ar' ? 'حرارة فسيولوجية آمنة' : 'Safe range')}
          </span>
        </div>

        {/* Metric 2: Root Moisture */}
        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 flex flex-col justify-between">
          <span className="text-[11px] text-neutral-400 font-bold">
            {lang === 'ar' ? 'رطوبة منطقة الجذور' : 'Root Moisture'}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-blue-600 font-mono">
              ~{Math.round(telemetry.rootZoneMoistureMm)}
            </span>
            <span className="text-[10px] font-bold text-neutral-400">mm</span>
          </div>
          <span className="text-[10px] text-neutral-400 mt-0.5">
            {telemetry.rootZoneMoistureMm < 25 ? (lang === 'ar' ? 'مستوى حرج' : 'Critical') : (lang === 'ar' ? 'مستوى كافٍ' : 'Adequate')}
          </span>
        </div>

        {/* Metric 3: Stress Velocity */}
        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 flex flex-col justify-between">
          <span className="text-[11px] text-neutral-400 font-bold">
            {lang === 'ar' ? 'سرعة انهيار الرطوبة' : 'Stress Velocity (7d)'}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-xl font-black font-mono ${
                telemetry.deltaESI7d < -0.15 ? 'text-red-600' : 'text-neutral-700 dark:text-neutral-300'
              }`}
            >
              {telemetry.deltaESI7d.toFixed(2)}
            </span>
            <span className="text-[10px] font-bold text-neutral-400">/wk</span>
          </div>
          <span className="text-[10px] text-neutral-400 mt-0.5">
            {telemetry.deltaESI7d < -0.15 ? (lang === 'ar' ? 'جفاف ومضي متسارع' : 'Flash desiccation') : (lang === 'ar' ? 'معدل هبوط طبيعي' : 'Normal depletion')}
          </span>
        </div>

        {/* Metric 4: Lead Time or Quench Action */}
        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 flex flex-col justify-between">
          <span className="text-[11px] text-neutral-400 font-bold">
            {lang === 'ar' ? 'النافذة الزمنية للإنقاذ' : 'Early Save Window'}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-emerald-600 font-mono">
              {level === 3 ? '14' : '30+'}
            </span>
            <span className="text-[10px] font-bold text-neutral-400">{lang === 'ar' ? 'يوماً' : 'days'}</span>
          </div>
          <span className="text-[10px] text-neutral-400 mt-0.5">
            {lang === 'ar' ? 'قبل اصفرار الورق' : 'Before visual browning'}
          </span>
        </div>
      </div>
    </div>
  );
}
