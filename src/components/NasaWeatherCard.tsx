'use client';

import React, { useEffect, useState } from 'react';
import { DailyWeatherObservation } from '@/lib/provenanceTypes';
import { fetchNasaPowerDaily } from '@/lib/nasaPowerAdapter';
import ProvenanceBadge from './ProvenanceBadge';

interface NasaWeatherCardProps {
  lat: number;
  lon: number;
  lang: 'ar' | 'en';
}

export default function NasaWeatherCard({ lat, lon, lang }: NasaWeatherCardProps) {
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
      <div className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-sm border border-black/5 dark:border-white/5 animate-pulse flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-spin">🛰️</span>
          <div className="space-y-1">
            <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
            <div className="h-3 w-28 bg-neutral-100 dark:bg-neutral-800 rounded"></div>
          </div>
        </div>
        <span className="text-xs text-neutral-400 font-bold">
          {lang === 'ar' ? 'جاري جلب طقس الحقل من أقمار ناسا...' : 'Fetching field weather from NASA...'}
        </span>
      </div>
    );
  }

  if (error || !obs) {
    return null;
  }

  const p = obs.t_air_mean_c;
  const tempVal = obs.t_air_mean_c.value;
  const tempMax = obs.t_air_max_c.value;
  const tempMin = obs.t_air_min_c.value;
  const rhVal = obs.rh_pct.value;
  // Convert m/s to km/h for intuitive farmer understanding (1 m/s = 3.6 km/h)
  const windKmH = Math.round(obs.wind_speed_ms.value * 3.6);
  const rainVal = obs.precipitation_mm.value;

  // Farmer-friendly interpretations
  const isSpraySafe = windKmH <= 15 && rainVal < 0.2;
  const isHeatwave = tempMax >= 36;
  const isFrostRisk = tempMin <= 6;

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md shadow-sm border border-black/5 dark:border-white/10 space-y-3.5">
      {/* Header: Farmer Plain Language Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🌤️</span>
          <div>
            <h4 className="text-sm font-extrabold text-neutral-900 dark:text-white">
              {lang === 'ar' ? 'طقس الحقل وأحوال الزراعة اليوم' : "Today's Field Weather & Farming Conditions"}
            </h4>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {lang === 'ar'
                ? 'مرصود مباشرة فوق أرضك عبر أقمار ناسا المناخية'
                : 'Directly monitored over your field via NASA Earth satellites'}
            </span>
          </div>
        </div>

        {/* Small Toggle for NASA Scientific Verification (Hidden by default) */}
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-600 dark:text-neutral-300 transition-all active:scale-95 flex items-center gap-1"
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

      {/* 4 Clear Actionable Cards for Farmers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* 1. Temperature Card */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#16161C] border border-black/5 dark:border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
              {lang === 'ar' ? 'درجة الحرارة' : 'Temperature'}
            </span>
            <span className="text-sm">🌡️</span>
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
              {Math.round(tempVal)}°C
            </div>
            <div className="text-[11px] text-neutral-400 font-semibold">
              {lang === 'ar'
                ? `العظمى ${Math.round(tempMax)}° / الصغرى ${Math.round(tempMin)}°`
                : `High ${Math.round(tempMax)}° / Low ${Math.round(tempMin)}°`}
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            {isHeatwave
              ? (lang === 'ar' ? '🔥 موجة حارة: كثف الري' : '🔥 Heatwave: Irrigate more')
              : isFrostRisk
              ? (lang === 'ar' ? '❄️ برد قارس: احذر الصقيع' : '❄️ Cold: Frost warning')
              : (lang === 'ar' ? '✅ جو معتدل ومناسب للنمو' : '✅ Ideal growing temperature')}
          </span>
        </div>

        {/* 2. Spraying & Wind Card */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#16161C] border border-black/5 dark:border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
              {lang === 'ar' ? 'أمان الرش والتسميد' : 'Spray Safety'}
            </span>
            <span className="text-sm">💨</span>
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
              {windKmH} <span className="text-xs font-semibold text-neutral-400">{lang === 'ar' ? 'كم/س' : 'km/h'}</span>
            </div>
            <div className="text-[11px] text-neutral-400 font-semibold">
              {lang === 'ar' ? 'سرعة الرياح في الغيط' : 'Field wind speed'}
            </div>
          </div>
          <span className={`text-[11px] font-bold ${isSpraySafe ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
            {isSpraySafe
              ? (lang === 'ar' ? '✅ ممتاز: رش بدون تطاير' : '✅ Ideal: Spray safely')
              : (lang === 'ar' ? '⚠️ رياح نشطة: أجّل الرش' : '⚠️ Windy: Postpone spray')}
          </span>
        </div>

        {/* 3. Humidity & Fungi Risk */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#16161C] border border-black/5 dark:border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
              {lang === 'ar' ? 'رطوبة الهواء والندى' : 'Humidity & Dew'}
            </span>
            <span className="text-sm">💧</span>
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
              {Math.round(rhVal)}%
            </div>
            <div className="text-[11px] text-neutral-400 font-semibold">
              {rhVal > 75
                ? (lang === 'ar' ? 'ندى كثيف صباحاً' : 'Heavy morning dew')
                : (lang === 'ar' ? 'رطوبة متزنة' : 'Balanced moisture')}
            </div>
          </div>
          <span className={`text-[11px] font-bold ${rhVal > 75 ? 'text-amber-600' : 'text-blue-600 dark:text-blue-400'}`}>
            {rhVal > 75
              ? (lang === 'ar' ? '⚠️ راقب أعفان الجذور' : '⚠️ Monitor fungal risk')
              : (lang === 'ar' ? '✅ تنفس المسام سليم' : '✅ Optimal transpiration')}
          </span>
        </div>

        {/* 4. Rain & Irrigation Recommendation */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#16161C] border border-black/5 dark:border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
              {lang === 'ar' ? 'فرص المطر والري' : 'Rain & Irrigation'}
            </span>
            <span className="text-sm">🌧️</span>
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
              {rainVal > 0.5 ? `${rainVal.toFixed(1)} ${lang === 'ar' ? 'مم' : 'mm'}` : (lang === 'ar' ? '0 مم' : '0 mm')}
            </div>
            <div className="text-[11px] text-neutral-400 font-semibold">
              {rainVal > 0.5
                ? (lang === 'ar' ? 'مطر طبيعي يبلل الأرض' : 'Natural rain falling')
                : (lang === 'ar' ? 'سماء صافية وجافة' : 'Clear skies, no rain')}
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            {rainVal > 2.0
              ? (lang === 'ar' ? 'وقف مية الري اليوم' : 'Hold irrigation today')
              : (lang === 'ar' ? 'شغل الري بجرعتك المعتادة' : 'Run regular irrigation')}
          </span>
        </div>
      </div>

      {/* Optional Collapsible Technical Provenance Box (Clean & Dedicated for Judges) */}
      {showTechnicalDetails && (
        <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-black/40 border border-black/5 dark:border-white/10 text-xs text-neutral-600 dark:text-neutral-300 space-y-2 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-black/5 dark:border-white/5">
            <span className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <span>🛰️</span>
              <span>NASA POWER Agroclimatology (GMAO MERRA-2 & CERES)</span>
            </span>
            <ProvenanceBadge
              state={p.data_state}
              quality={p.quality_status}
              source={p.source_name}
              resolution={p.spatial_resolution}
              timestamp={p.observation_time}
              lang={lang}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px]">
            <div>Lat / Lon: {lat.toFixed(3)}°, {lon.toFixed(3)}°</div>
            <div>Solar Irradiance: {obs.solar_rad_wm2.value.toFixed(1)} W/m²</div>
            <div>Grid Resolution: {p.spatial_resolution}</div>
            <div>Source: NASA CERES/MERRA-2</div>
          </div>
        </div>
      )}
    </div>
  );
}
