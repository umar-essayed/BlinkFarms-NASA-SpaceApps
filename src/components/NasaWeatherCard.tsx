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

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-sm border border-black/5 dark:border-white/5 space-y-3">
      {/* Header with Provenance Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛰️</span>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
              {lang === 'ar' ? 'رصد الغلاف الجوي والإشعاع (NASA POWER)' : 'Atmospheric & Solar Observation (NASA POWER)'}
            </h4>
            <span className="text-[11px] text-neutral-400">
              {lang === 'ar' ? 'نموذج MERRA-2 وقمر CERES الصناعي' : 'MERRA-2 Assimilation & CERES Sensor'}
            </span>
          </div>
        </div>

        <ProvenanceBadge
          state={p.data_state}
          quality={p.quality_status}
          source={p.source_name}
          resolution={p.spatial_resolution}
          timestamp={p.observation_time}
          lang={lang}
        />
      </div>

      {/* Grid of 4 Verified Observations */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {/* Air Temp */}
        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 flex flex-col justify-between">
          <span className="text-[11px] text-neutral-400 font-bold">
            {lang === 'ar' ? 'حرارة الهواء (T2M)' : 'Air Temp (2m)'}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-neutral-900 dark:text-white font-mono">
              {obs.t_air_mean_c.value.toFixed(1)}°C
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 mt-0.5">
            {obs.t_air_min_c.value.toFixed(0)}° / {obs.t_air_max_c.value.toFixed(0)}°C
          </span>
        </div>

        {/* Relative Humidity */}
        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 flex flex-col justify-between">
          <span className="text-[11px] text-neutral-400 font-bold">
            {lang === 'ar' ? 'الرطوبة النسبية (RH)' : 'Relative Humidity'}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-neutral-900 dark:text-white font-mono">
              {Math.round(obs.rh_pct.value)}%
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 mt-0.5">
            {obs.rh_pct.value < 30 ? (lang === 'ar' ? 'هواء جاف' : 'Dry air') : (lang === 'ar' ? 'رطوبة متزنة' : 'Balanced')}
          </span>
        </div>

        {/* Solar Radiation */}
        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 flex flex-col justify-between">
          <span className="text-[11px] text-neutral-400 font-bold">
            {lang === 'ar' ? 'الإشعاع الشمسي (Rs)' : 'Solar Radiation'}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-amber-500 font-mono">
              {obs.solar_rad_wm2.value.toFixed(0)}
            </span>
            <span className="text-[10px] font-bold text-neutral-400">W/m²</span>
          </div>
          <span className="text-[10px] text-neutral-400 mt-0.5">
            {obs.solar_rad_wm2.processing_method || 'NASA CERES'}
          </span>
        </div>

        {/* Wind Speed & Precip */}
        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 flex flex-col justify-between">
          <span className="text-[11px] text-neutral-400 font-bold">
            {lang === 'ar' ? 'سرعة الرياح والأمطار' : 'Wind & Rain'}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-blue-500 font-mono">
              {obs.wind_speed_ms.value.toFixed(1)}
            </span>
            <span className="text-[10px] font-bold text-neutral-400">m/s</span>
          </div>
          <span className="text-[10px] text-neutral-400 mt-0.5">
            {lang === 'ar' ? `أمطار: ${obs.precipitation_mm.value.toFixed(1)} ملم` : `Precip: ${obs.precipitation_mm.value.toFixed(1)} mm`}
          </span>
        </div>
      </div>
    </div>
  );
}
