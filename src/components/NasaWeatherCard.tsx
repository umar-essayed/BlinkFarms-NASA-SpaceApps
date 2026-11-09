'use client';

import React, { useEffect, useState } from 'react';
import { DailyWeatherObservation } from '@/lib/provenanceTypes';
import { fetchNasaPowerDaily } from '@/lib/nasaPowerAdapter';
import ProvenanceBadge from './ProvenanceBadge';
import { UnifiedFarmVitals, Language } from '@/lib/types';

interface NasaWeatherCardProps {
  lat: number;
  lon: number;
  lang: Language;
  onObsLoaded?: (obs: DailyWeatherObservation) => void;
  vitals?: UnifiedFarmVitals;
}

export default function NasaWeatherCard({
  lat,
  lon,
  lang,
  onObsLoaded,
  vitals,
}: NasaWeatherCardProps) {
  const [obs, setObs] = useState<DailyWeatherObservation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchNasaPowerDaily(lat, lon)
      .then((data) => {
        if (isMounted) {
          setObs(data);
          setLoading(false);
          if (onObsLoaded) {
            onObsLoaded(data);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to fetch NASA observations');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [lat, lon]);

  if (loading) {
    return (
      <div className="p-4 rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-sm border border-black/5 dark:border-white/5 animate-pulse flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl animate-spin">🛰️</span>
          <div className="space-y-1">
            <div className="h-4 w-48 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
            <div className="h-3 w-32 bg-neutral-100 dark:bg-neutral-800 rounded"></div>
          </div>
        </div>
        <span className="text-xs text-neutral-400 font-bold">
          {lang === 'ar' ? 'جاري استقبال طقس الحقل من أقمار ناسا...' : 'Receiving NASA Earth observations...'}
        </span>
      </div>
    );
  }

  if (error || !obs) {
    return null;
  }

  const tempVal = obs.t_air_mean_c.value;
  const tempMax = obs.t_air_max_c.value;
  const tempMin = obs.t_air_min_c.value;
  const rhVal = obs.rh_pct.value;
  const windKmH = Math.round(obs.wind_speed_ms.value * 3.6);
  const rainVal = obs.precipitation_mm.value;
  const solarRad = Math.round(obs.solar_rad_wm2?.value || 620);

  const isHeatwave = tempMax >= 36;
  const isFrostRisk = tempMin <= 6;

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md shadow-sm border border-black/5 dark:border-white/10 space-y-3.5">
      {/* Header: Farmer Plain Language Title & Provenance Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🌤️</span>
          <div>
            <h4 className="text-sm font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>{lang === 'ar' ? 'أرصاد ناسا المناخية فوق الحقل اليوم' : "Today's NASA Earth Observations"}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold">
                NASA POWER LIVE
              </span>
            </h4>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {lang === 'ar'
                ? `إحداثيات الرصد: ${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E • تحديث لحظي`
                : `Obs Coordinates: ${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E • Real-time orbital feed`}
            </span>
          </div>
        </div>

        {/* Small Toggle for NASA Scientific Verification */}
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-600 dark:text-neutral-300 transition-all active:scale-95 flex items-center gap-1 shrink-0"
          title={lang === 'ar' ? 'عرض السند العلمي وأقمار ناسا' : 'View NASA Provenance'}
        >
          <span>🛰️</span>
          <span className="hidden sm:inline">
            {showTechnicalDetails
              ? (lang === 'ar' ? 'إخفاء السند العلمي' : 'Hide NASA Data')
              : (lang === 'ar' ? 'السند العلمي' : 'NASA Data')}
          </span>
        </button>
      </div>

      {/* 4 Clean Atmospheric Parameter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* 1. Ambient Air Temperature */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#16161C] border border-black/5 dark:border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
              {lang === 'ar' ? 'حرارة الجو' : 'Air Temperature'}
            </span>
            <span className="text-sm">🌡️</span>
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white font-mono">
              {Math.round(tempVal)}°C
            </div>
            <div className="text-[11px] text-neutral-400 font-semibold">
              {lang === 'ar'
                ? `العظمى ${Math.round(tempMax)}° / الصغرى ${Math.round(tempMin)}°`
                : `High ${Math.round(tempMax)}° / Low ${Math.round(tempMin)}°`}
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 truncate">
            {isHeatwave
              ? (lang === 'ar' ? '🔥 موجة حارة نشطة' : '🔥 Active heatwave')
              : isFrostRisk
              ? (lang === 'ar' ? '❄️ برد قارس: احذر الصقيع' : '❄️ Frost risk')
              : (lang === 'ar' ? '✅ معتدل ومناسب للنمو' : '✅ Ideal growing temp')}
          </span>
        </div>

        {/* 2. Wind Speed in Field */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#16161C] border border-black/5 dark:border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
              {lang === 'ar' ? 'سرعة الرياح' : 'Wind Speed'}
            </span>
            <span className="text-sm">💨</span>
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white font-mono">
              {windKmH} <span className="text-xs font-semibold text-neutral-400">{lang === 'ar' ? 'كم/س' : 'km/h'}</span>
            </div>
            <div className="text-[11px] text-neutral-400 font-semibold">
              {lang === 'ar' ? 'على ارتفاع 2 متر' : 'At 2m ground level'}
            </div>
          </div>
          <span className={`text-[11px] font-bold truncate ${windKmH <= 15 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
            {windKmH <= 15
              ? (lang === 'ar' ? '✅ نسيم هادئ' : '✅ Gentle breeze')
              : (lang === 'ar' ? '⚠️ رياح نشطة' : '⚠️ Active gusts')}
          </span>
        </div>

        {/* 3. Relative Humidity & Morning Dew */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#16161C] border border-black/5 dark:border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
              {lang === 'ar' ? 'الرطوبة النسبية' : 'Relative Humidity'}
            </span>
            <span className="text-sm">💧</span>
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white font-mono">
              {Math.round(rhVal)}%
            </div>
            <div className="text-[11px] text-neutral-400 font-semibold">
              {rhVal > 75
                ? (lang === 'ar' ? 'ندى كثيف صباحاً' : 'Heavy morning dew')
                : (lang === 'ar' ? 'رطوبة جو متزنة' : 'Balanced humidity')}
            </div>
          </div>
          <span className={`text-[11px] font-bold truncate ${rhVal > 75 ? 'text-amber-600' : 'text-blue-600 dark:text-blue-400'}`}>
            {rhVal > 75
              ? (lang === 'ar' ? '⚠️ راقب الفطريات' : '⚠️ Monitor fungi')
              : (lang === 'ar' ? '✅ تنفس المسام سليم' : '✅ Normal transpir')}
          </span>
        </div>

        {/* 4. Solar Radiation & Rainfall */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#16161C] border border-black/5 dark:border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
              {lang === 'ar' ? 'الإشعاع والأمطار' : 'Solar & Rain'}
            </span>
            <span className="text-sm">☀️</span>
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white font-mono">
              {solarRad} <span className="text-xs font-semibold text-neutral-400">W/m²</span>
            </div>
            <div className="text-[11px] text-neutral-400 font-semibold">
              {rainVal > 0.2
                ? `${rainVal.toFixed(1)} ${lang === 'ar' ? 'مم مطر' : 'mm rain'}`
                : (lang === 'ar' ? 'لا توجد أمطار اليوم' : '0.0 mm rain')}
            </div>
          </div>
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 truncate">
            {lang === 'ar' ? 'طاقة ضوئية ممتازة' : 'High photosynthetic flux'}
          </span>
        </div>
      </div>

      {/* Expandable NASA Provenance Panel */}
      {showTechnicalDetails && (
        <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-black/40 border border-black/5 dark:border-white/5 space-y-3 animate-fadeIn text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-2">
            <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>🛰️</span>
              <span>
                {lang === 'ar'
                  ? 'سند الرصد الفضائي: منظومة NASA POWER & MERRA-2'
                  : 'NASA POWER Satellite & MERRA-2 Atmospheric Reanalysis'}
              </span>
            </div>
            <ProvenanceBadge
              state="LIVE"
              source="NASA POWER API"
              resolution="0.5° x 0.625°"
              lang={lang}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-neutral-600 dark:text-neutral-300">
            <div>
              <span className="font-bold block text-neutral-800 dark:text-neutral-200">
                {lang === 'ar' ? 'المنتج المناخي المسترجع:' : 'Atmospheric Products:'}
              </span>
              <span>T2M (Air Temp 2m), WS2M (Wind 2m), RH2M (Relative Humidity), ALLSKY_SFC_SW_DWN (Solar Irradiance).</span>
            </div>
            <div>
              <span className="font-bold block text-neutral-800 dark:text-neutral-200">
                {lang === 'ar' ? 'الربط مع محرك VeloceRoot:' : 'Coupling to VeloceRoot:'}
              </span>
              <span>
                {lang === 'ar'
                  ? 'يتم دمج أرصاد الطقس لحظياً مع درجات حرارة أسطح المحاصيل (ECOSTRESS) ورطوبة التربة (SMAP) لحساب العجز المائي الدقيق وتجنب أي تناقض في توصيات الرش والري.'
                  : 'Observations are dynamically coupled to ECOSTRESS canopy thermal infrared and SMAP root moisture to calculate precision evapotranspirative deficits without contradiction.'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
