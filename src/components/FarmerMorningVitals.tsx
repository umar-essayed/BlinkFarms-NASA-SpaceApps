'use client';

import React from 'react';
import { FlashDroughtTelemetry, UnifiedFarmVitals, Language } from '@/lib/types';

interface FarmerMorningVitalsProps {
  telemetry: FlashDroughtTelemetry;
  vitals?: UnifiedFarmVitals;
  areaFeddan: number;
  lang: Language;
}

export default function FarmerMorningVitals({
  telemetry,
  vitals,
  areaFeddan,
  lang,
}: FarmerMorningVitalsProps) {
  // 1. Irrigation Prescription (Single Authoritative Source)
  const prescribedMm = vitals?.irrigationPrescription.depthMm ?? (telemetry.prescribedIrrigationMm || 17.2);
  const m3PerFeddan = vitals?.irrigationPrescription.volumePerFeddanM3 ?? Math.round(prescribedMm * 4.20083);
  const totalFieldM3 = vitals?.irrigationPrescription.volumeTotalFieldM3 ?? Math.round(m3PerFeddan * areaFeddan);
  const urgency = vitals?.irrigationPrescription.urgencyLevel ?? (telemetry.isFlashDroughtAlert ? 'emergency_quenching' : 'routine_maintenance');

  // 2. Agrochemical & Foliar Spray Window
  const isSpraySafe = vitals?.sprayWindow.isSafeToSpray ?? (!telemetry.isFlashDroughtAlert);
  const windKmH = vitals?.sprayWindow.windSpeedKmH ?? 11;
  const rhPct = vitals?.sprayWindow.relativeHumidityPct ?? 58;
  const sprayVerdict = vitals?.sprayWindow.verdictAr ?? (isSpraySafe ? '✅ ساعات آمنة للرش: رياح هادئة ولا خطر للتطاير' : '⚠️ تأجيل الرش: نشاط رياح أو حرارة مرتفعة');
  const sprayVerdictEn = vitals?.sprayWindow.verdictEn ?? (isSpraySafe ? '✅ Safe window: Calm winds, no droplet drift risk' : '⚠️ Delay spraying: Active wind or high temperature');
  const spraySlot = vitals?.sprayWindow.recommendedTimeSlotAr ?? 'الفترة الآمنة: 6:00 ص إلى 8:30 ص';
  const spraySlotEn = vitals?.sprayWindow.recommendedTimeSlotEn ?? 'Safest slot: 6:00 to 8:30 AM';

  // 3. Plant vs Ambient Thermodynamics
  const ambientAirC = vitals?.temperature.ambientAirC ?? telemetry.airTempC;
  const canopyTempC = vitals?.temperature.canopyTempC ?? telemetry.canopyTempC;
  const deltaTC = vitals?.temperature.deltaTC ?? Number((canopyTempC - ambientAirC).toFixed(1));
  const isFever = deltaTC > 1.8 || telemetry.isFlashDroughtAlert;
  const isCooled = deltaTC <= 0.2;

  // 4. Root-Zone Subsoil Hydrology (SMAP 30m)
  const rootMoisturePct = vitals?.hydrology.rootZoneMoisturePercent ?? Math.min(100, Math.round((telemetry.rootZoneMoistureMm / 70) * 100));
  const rootMm = vitals?.hydrology.rootZoneMoistureMm ?? telemetry.rootZoneMoistureMm;

  return (
    <div className="space-y-3">
      {/* Executive Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-1">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">☀️</span>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>{lang === 'ar' ? 'لوحة القرارات التنفيذية اليومية للحقل' : 'Daily Field Operations Center'}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                UNIFIED V2
              </span>
            </h3>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {lang === 'ar'
                ? 'توجيهات تشغيلية موحدة ومحسوبة بدقة أقمار ناسا (ECOSTRESS + SMAP + POWER)'
                : 'Unified operational prescriptions coupled to NASA satellite telemetry'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>{lang === 'ar' ? `حيازة: ${areaFeddan} فدان` : `Parcel: ${areaFeddan} feddans`}</span>
        </div>
      </div>

      {/* The 4 Authoritative Operational Decision Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* CARD 1: TODAY'S IRRIGATION PRESCRIPTION */}
        <div className="p-4 sm:p-5 rounded-3xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                <span>💧</span>
                <span>{lang === 'ar' ? 'قرار الري اليوم' : "Today's Irrigation"}</span>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                urgency === 'emergency_quenching'
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  : urgency === 'early_deficit_replenish'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
              }`}>
                {urgency === 'emergency_quenching'
                  ? (lang === 'ar' ? '🚨 ري إنقاذي عاجل' : '🚨 Urgent Quenching')
                  : urgency === 'early_deficit_replenish'
                  ? (lang === 'ar' ? '⚡ ري تعويضي' : '⚡ Replenish')
                  : (lang === 'ar' ? '💧 ري صيانة دوري' : '💧 Routine Maintenance')}
              </span>
            </div>

            <div className="my-2.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">
                  {m3PerFeddan}
                </span>
                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
                  {lang === 'ar' ? 'م³/فدان' : 'm³/fed'}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mt-1">
                {lang === 'ar'
                  ? `إجمالي الحقل (${areaFeddan} فدان): ${totalFieldM3.toLocaleString()} م³`
                  : `Total field (${areaFeddan} fed): ${totalFieldM3.toLocaleString()} m³`}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-blue-200/50 dark:border-blue-900/30 space-y-1">
            <p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 leading-snug">
              {lang === 'ar'
                ? `تعادل عمق ${prescribedMm.toFixed(1)} مم مياه محسوبة بدقة FAO-56.`
                : `Equals ${prescribedMm.toFixed(1)} mm depth tuned to FAO-56 evaporative deficit.`}
            </p>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block">
              {lang === 'ar' ? '⏰ أفضل ميعاد: 5:00 إلى 8:00 صباحاً' : '⏰ Best slot: 5:00 - 8:00 AM'}
            </span>
          </div>
        </div>

        {/* CARD 2: UNIFIED SPRAY & WIND VERDICT */}
        <div className={`p-4 sm:p-5 rounded-3xl border shadow-sm flex flex-col justify-between ${
          isSpraySafe
            ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
            : 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                <span>🚜</span>
                <span>{lang === 'ar' ? 'قرار الرش والتسميد الورقي' : 'Foliar Spray Window'}</span>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isSpraySafe
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
              }`}>
                {isSpraySafe
                  ? (lang === 'ar' ? 'ساعات آمنة ✅' : 'Safe Window ✅')
                  : (lang === 'ar' ? 'تأجيل الرش ⚠️' : 'Delay Spray ⚠️')}
              </span>
            </div>

            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className={`text-xl sm:text-2xl font-black ${
                  isSpraySafe ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {isSpraySafe
                    ? (lang === 'ar' ? 'مسموح بالرش الآن' : 'Ideal to Spray')
                    : (lang === 'ar' ? 'أجّل الرش مؤقتاً' : 'Postpone Spray')}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-2">
                <span>💨 {windKmH} {lang === 'ar' ? 'كم/س رياح' : 'km/h wind'}</span>
                <span>•</span>
                <span>💧 {rhPct}% {lang === 'ar' ? 'رطوبة' : 'humidity'}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-1">
            <p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 leading-snug">
              {lang === 'ar' ? sprayVerdict : sprayVerdictEn}
            </p>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold block">
              {lang === 'ar' ? spraySlot : spraySlotEn}
            </span>
          </div>
        </div>

        {/* CARD 3: THERMODYNAMICS & CANOPY FEVER (Ta vs Tc) */}
        <div className={`p-4 sm:p-5 rounded-3xl border shadow-sm flex flex-col justify-between ${
          isFever
            ? 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40'
            : isCooled
            ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
            : 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                <span>🌡️</span>
                <span>{lang === 'ar' ? 'ميزان حرارة النبات والجو' : 'Canopy Thermodynamics'}</span>
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                isFever
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              }`}>
                {deltaTC > 0 ? `ΔT +${deltaTC}°C` : `ΔT ${deltaTC}°C`}
              </span>
            </div>

            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl sm:text-3xl font-black font-mono ${
                  isFever ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {canopyTempC}°C
                </span>
                <span className="text-xs font-bold text-neutral-500">
                  {lang === 'ar' ? 'حرارة الأوراق' : 'Leaf Temp (Tc)'}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mt-1">
                {lang === 'ar'
                  ? `حرارة الهواء الجوي: ${ambientAirC}°م • ${deltaTC > 0 ? `حمى نتحية (+${deltaTC}°م)` : `تبريد ذاتي (${deltaTC}°م)`}`
                  : `Ambient Air: ${ambientAirC}°C • ${deltaTC > 0 ? `Canopy Fever (+${deltaTC}°C)` : `Self-Cooled (${deltaTC}°C)`}`}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-1">
            <p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 leading-snug">
              {isFever
                ? (lang === 'ar' ? 'المسام أغلقت لحبس الرطوبة فارتفعت حرارة الورقة، افتح الري اليوم.' : 'Stomata closed to retain moisture causing fever. Irrigate parcel today.')
                : (lang === 'ar' ? 'النتح شغال بسلاسة والأوراق مبردة ذاتياً تحت حرارة الجو.' : 'Transpirational cooling running smoothly; canopy is cooler than air.')}
            </p>
          </div>
        </div>

        {/* CARD 4: ROOT-ZONE SOIL MOISTURE (SMAP 30m) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-teal-50/80 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-900/40 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                <span>🌍</span>
                <span>{lang === 'ar' ? 'رطوبة باطن الأرض (الجذور)' : 'Root-Zone Moisture (SMAP)'}</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                30m RESOLUTION
              </span>
            </div>

            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-teal-600 dark:text-teal-400 font-mono">
                  {rootMoisturePct}%
                </span>
                <span className="text-xs font-bold text-neutral-500">
                  {lang === 'ar' ? 'سعة حقلية' : 'Available Water'}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mt-1">
                {lang === 'ar'
                  ? `مسبار SMAP بدقة 30م: ${rootMm.toFixed(1)} مم ماء متوفر`
                  : `Downscaled SMAP: ${rootMm.toFixed(1)} mm available water`}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-teal-200/50 dark:border-teal-900/30 space-y-1">
            <p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 leading-snug">
              {rootMoisturePct >= 50
                ? (lang === 'ar' ? 'مخزون الرطوبة حول الجذور آمن ومريح للنبات.' : 'Healthy moisture reservoir in active root uptake zone.')
                : (lang === 'ar' ? 'مخزون القاع منخفض، يحتاج ري عميق لترطيب الجذور.' : 'Subsoil reservoir depleted, deep soaking recommended.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
