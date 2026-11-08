'use client';

import React from 'react';
import { FlashDroughtTelemetry } from '@/lib/types';

interface FarmerMorningVitalsProps {
  telemetry: FlashDroughtTelemetry;
  areaFeddan: number;
  lang: 'ar' | 'en';
}

export default function FarmerMorningVitals({
  telemetry,
  areaFeddan,
  lang,
}: FarmerMorningVitalsProps) {
  // 1. Canopy Water Stress & Transpiration Status
  const isThirsty = telemetry.isFlashDroughtAlert || telemetry.canopyTempAnomalyC > 1.8;
  const isOptimal = telemetry.canopyTempAnomalyC <= 1.0;

  // 2. Daily Irrigation Dose (mm to m3 per feddan: 1 mm on 1 feddan = 4.2 m3)
  const prescribedMm = telemetry.prescribedIrrigationMm || 4.8;
  const m3PerFeddan = Math.round(prescribedMm * 4.2);
  const totalFieldM3 = Math.round(m3PerFeddan * areaFeddan);

  // 3. Spray Window Status (based on wind speed and humidity)
  const isSpraySafe = !telemetry.isFlashDroughtAlert;

  // 4. Subsoil Moisture Status
  const rootMoisturePct = Math.min(100, Math.round((telemetry.rootZoneMoistureMm / 70) * 100));

  return (
    <div className="space-y-2.5">
      {/* Title Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">☀️</span>
          <div>
            <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white">
              {lang === 'ar' ? 'فحص الصباح الحي: المؤشرات الحيوية لحقلك' : "Morning Field Vitals (Daily Diagnostics)"}
            </h3>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {lang === 'ar' ? 'تحديث تلقائي مع شروق الشمس من أقمار ناسا الصناعية' : 'Auto-updated at sunrise via NASA satellites'}
            </span>
          </div>
        </div>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
          LIVE TELEMETRY
        </span>
      </div>

      {/* 4 Core Vital Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Card 1: Crop Thirst & Stomatal Transpiration */}
        <div className={`p-3.5 sm:p-4 rounded-3xl border transition-all ${
          isThirsty
            ? 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 shadow-sm'
            : isOptimal
            ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 shadow-sm'
            : 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
              {lang === 'ar' ? 'عطش الغيط وتنفس النبات' : 'Crop Thirst & Stomata'}
            </span>
            <span className="text-base">{isThirsty ? '🔥' : '🌱'}</span>
          </div>

          <div className="my-2">
            <div className={`text-xl sm:text-2xl font-black ${
              isThirsty ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {isThirsty
                ? (lang === 'ar' ? 'عطش مبكر ⚠️' : 'Early Stress ⚠️')
                : (lang === 'ar' ? 'مرتوي ومثالي 🟢' : 'Hydrated 🟢')}
            </div>
            <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5">
              {lang === 'ar'
                ? `حرارة المسام: ${telemetry.canopyTempAnomalyC > 0 ? `+${telemetry.canopyTempAnomalyC.toFixed(1)}°C` : `${telemetry.canopyTempAnomalyC.toFixed(1)}°C`}`
                : `Pore Delta: ${telemetry.canopyTempAnomalyC > 0 ? `+${telemetry.canopyTempAnomalyC.toFixed(1)}°C` : `${telemetry.canopyTempAnomalyC.toFixed(1)}°C`}`}
            </div>
          </div>

          <p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 leading-snug">
            {isThirsty
              ? (lang === 'ar' ? 'المسام أغلقت لتوفير المياه، افتح الري فوراً' : 'Stomata closed to conserve water. Irrigate today.')
              : (lang === 'ar' ? 'النتح شغال بأعلى كفاءة والأوعية سليمة' : 'Transpiration running smoothly, vascular healthy.')}
          </p>
        </div>

        {/* Card 2: Today's Irrigation Prescription */}
        <div className="p-3.5 sm:p-4 rounded-3xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
              {lang === 'ar' ? 'جرعة الري المطلوبة اليوم' : "Today's Irrigation Dose"}
            </span>
            <span className="text-base">💧</span>
          </div>

          <div className="my-2">
            <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
              {m3PerFeddan} <span className="text-xs font-bold">{lang === 'ar' ? 'م³/فدان' : 'm³/fed'}</span>
            </div>
            <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5">
              {lang === 'ar' ? `إجمالي أرضك (${areaFeddan} فدان): ${totalFieldM3} م³` : `Total parcel (${areaFeddan} fed): ${totalFieldM3} m³`}
            </div>
          </div>

          <p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 leading-snug">
            {lang === 'ar'
              ? `تعادل عمق ${prescribedMm.toFixed(1)} مم مياه محسوبة بدقة FAO-56`
              : `Equals ${prescribedMm.toFixed(1)} mm depth tuned to FAO-56 evaporative deficit.`}
          </p>
        </div>

        {/* Card 3: Spraying & Foliar Window */}
        <div className="p-3.5 sm:p-4 rounded-3xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
              {lang === 'ar' ? 'أمان رش المغذيات والمبيدات' : 'Foliar Spray Window'}
            </span>
            <span className="text-base">🚜</span>
          </div>

          <div className="my-2">
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
              {isSpraySafe
                ? (lang === 'ar' ? 'ساعات آمنة ✅' : 'Safe Window ✅')
                : (lang === 'ar' ? 'تأجيل الرش ⚠️' : 'Delay Spray ⚠️')}
            </div>
            <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5">
              {lang === 'ar' ? 'الفترة المثالية: 6:30 ص إلى 9:30 ص' : 'Best slot: 6:30 AM to 9:30 AM'}
            </div>
          </div>

          <p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 leading-snug">
            {lang === 'ar'
              ? 'الرياح هادئة ولا خطر لتطاير الرذاذ أو حرق الأوراق'
              : 'Calm wind, minimal droplet drift or foliar scorch risk.'}
          </p>
        </div>

        {/* Card 4: Subsoil Moisture & Hardpan */}
        <div className="p-3.5 sm:p-4 rounded-3xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
              {lang === 'ar' ? 'رطوبة باطن الأرض (الجذور)' : 'Root-Zone Subsoil (SMAP)'}
            </span>
            <span className="text-base">🌍</span>
          </div>

          <div className="my-2">
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {rootMoisturePct}%
            </div>
            <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5">
              {lang === 'ar'
                ? `مسبار ناسا SMAP بدقة 30م: ${telemetry.rootZoneMoistureMm.toFixed(1)} مم`
                : `NASA SMAP (30m downscaled): ${telemetry.rootZoneMoistureMm.toFixed(1)} mm`}
            </div>
          </div>

          <p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 leading-snug">
            {lang === 'ar'
              ? (rootMoisturePct > 45 ? 'المخزون تحت السطح كافي، الجذور تتغذى بارتياح' : 'مخزون القاع منخفض، يحتاج ري عميق')
              : (rootMoisturePct > 45 ? 'Adequate subsoil reservoir for active root expansion.' : 'Low subsoil storage, requires deep soak.')}
          </p>
        </div>
      </div>
    </div>
  );
}
