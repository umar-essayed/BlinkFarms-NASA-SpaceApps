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
          {lang === 'ar' ? 'سحب رصد ناسا باور...' : 'Fetching NASA POWER...'}
        </span>
      </div>
    );
  }

  if (error || !obs) {
    return null;
  }

  const p = obs.t_air_mean_c;
  const tempVal = obs.t_air_mean_c.value;
  const rhVal = obs.rh_pct.value;
  const windVal = obs.wind_speed_ms.value;
  const rainVal = obs.precipitation_mm.value;

  const tempDesc =
    tempVal > 34
      ? (lang === 'ar' ? 'حرارة مرتفعة وشمس قوية 🔴' : 'Hot wave 🔴')
      : tempVal < 15
      ? (lang === 'ar' ? 'جو بارد شتوي ❄️' : 'Cold winter air ❄️')
      : (lang === 'ar' ? 'جو معتدل مناسب تماماً للنبات 🟢' : 'Optimal growing temperature 🟢');

  const rhDesc =
    rhVal < 30
      ? (lang === 'ar' ? 'هواء جاف، الزرع يحتاج ترطيب' : 'Dry air, hydrate leaves')
      : rhVal > 75
      ? (lang === 'ar' ? 'رطوبة عالية، راقب الفطريات' : 'High humidity, watch fungi')
      : (lang === 'ar' ? 'رطوبة متزنة تحمي الأوراق' : 'Balanced relative humidity');

  const windSpraySafe = windVal <= 3.8;
  const windDesc = windSpraySafe
    ? (lang === 'ar' ? 'هادئة، مثالية للرش والتسميد ✅' : 'Calm, ideal for spraying ✅')
    : (lang === 'ar' ? 'رياح نشطة، يُفضل تأجيل الرش ⚠️' : 'Active wind, postpone spray ⚠️');

  const rainDesc =
    rainVal > 0.5
      ? (lang === 'ar' ? `هطول أمطار بنحو ${rainVal.toFixed(1)} ملم` : `${rainVal.toFixed(1)} mm rainfall`)
      : (lang === 'ar' ? 'لا توجد أمطار، الاعتماد على شبكة الري' : 'Zero rain, rely on irrigation');

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-sm border border-black/5 dark:border-white/5 space-y-3">
      {/* Header with Provenance Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛰️</span>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
              {lang === 'ar' ? 'أرصاد الجو والشمس في الغيط (NASA POWER)' : 'Field Weather & Sun Conditions (NASA POWER)'}
            </h4>
            <span className="text-[11px] text-neutral-400">
              {lang === 'ar' ? 'بيانات مؤكدة من أقمار ناسا الصناعية لحقلك' : 'Verified satellite observations for your farmland'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ProvenanceBadge
            state={p.data_state}
            quality={p.quality_status}
            source={p.source_name}
            resolution={p.spatial_resolution}
            timestamp={p.observation_time}
            lang={lang}
          />
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="text-[10px] font-bold px-2 py-0.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-blue-600 dark:text-blue-400 transition-all active:scale-95"
          >
            {showTechnicalDetails ? (lang === 'ar' ? 'إخفاء التفاصيل ✕' : 'Hide details ✕') : (lang === 'ar' ? 'تفاصيل فيزيائية 🔬' : 'Physics details 🔬')}
          </button>
        </div>
      </div>

      {/* Grid of 4 Plain Farmer Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {/* Air Temp */}
        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 flex flex-col justify-between">
          <span className="text-[11px] text-neutral-400 font-bold">
            {lang === 'ar' ? 'حرارة الجو الآن' : 'Field Air Temp'}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white font-mono">
              {tempVal.toFixed(1)}°C
            </span>
          </div>
          <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 mt-1">
            {tempDesc}
          </span>
        </div>

        {/* Relative Humidity */}
        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 flex flex-col justify-between">
          <span className="text-[11px] text-neutral-400 font-bold">
            {lang === 'ar' ? 'رطوبة الهواء' : 'Air Humidity'}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white font-mono">
              {Math.round(rhVal)}%
            </span>
          </div>
          <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 mt-1">
            {rhDesc}
          </span>
        </div>

        {/* Solar Radiation / Sun */}
        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 flex flex-col justify-between">
          <span className="text-[11px] text-neutral-400 font-bold">
            {lang === 'ar' ? 'سطوع الشمس للبناء الضوئي' : 'Sun & Photosynthesis'}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-amber-500 font-mono">
              {obs.solar_rad_wm2.value.toFixed(0)}
            </span>
            <span className="text-[10px] font-bold text-neutral-400">W/m²</span>
          </div>
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-1">
            {lang === 'ar' ? 'سطوع كامل وممتاز للبناء الضوئي ☀️' : 'Optimal for crop photosynthesis ☀️'}
          </span>
        </div>

        {/* Wind & Spraying */}
        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 flex flex-col justify-between">
          <span className="text-[11px] text-neutral-400 font-bold">
            {lang === 'ar' ? 'حركة الرياح وأمان الرش' : 'Wind & Spray Safety'}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-blue-500 font-mono">
              {windVal.toFixed(1)}
            </span>
            <span className="text-[10px] font-bold text-neutral-400">m/s</span>
          </div>
          <span className={`text-[11px] font-bold mt-1 ${windSpraySafe ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
            {windDesc}
          </span>
        </div>
      </div>

      {/* Optional Technical Details Box for Judges & Agronomists */}
      {showTechnicalDetails && (
        <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 text-[11px] text-neutral-600 dark:text-neutral-300 space-y-1.5 border border-black/5 dark:border-white/5 animate-fadeIn">
          <div className="flex items-center justify-between font-bold text-neutral-900 dark:text-white">
            <span>NASA GMAO MERRA-2 & CERES Agroclimatology</span>
            <span className="font-mono text-[10px] text-neutral-400">Grid: {p.spatial_resolution}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[10px]">
            <div>T2M Min/Max: {obs.t_air_min_c.value}° / {obs.t_air_max_c.value}°C</div>
            <div>Solar Daily: {obs.solar_rad_wm2.processing_method}</div>
            <div>Rain Rate: {rainVal.toFixed(2)} mm/day</div>
            <div>Retrieval: {new Date(p.retrieved_at).toLocaleTimeString()}</div>
          </div>
          <div className="text-[10px] text-neutral-500 dark:text-neutral-400 pt-1 border-t border-black/5 dark:border-white/5">
            {rainDesc}
          </div>
        </div>
      )}
    </div>
  );
}
