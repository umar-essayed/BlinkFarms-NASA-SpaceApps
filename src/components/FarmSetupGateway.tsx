'use client';

import React, { useState } from 'react';
import { Language } from '@/lib/types';
import { DEMO_FIELDS, FieldPreset } from '@/lib/veloceRootEngine';

interface FarmSetupGatewayProps {
  lang: Language;
  onSelectPreset: (preset: FieldPreset) => void;
  onSelectCustom: (lat: number, lon: number, name: string, areaFeddan: number) => void;
}

export default function FarmSetupGateway({
  lang,
  onSelectPreset,
  onSelectCustom,
}: FarmSetupGatewayProps) {
  const [tab, setTab] = useState<'presets' | 'custom'>('presets');
  const [customName, setCustomName] = useState('');
  const [customLat, setCustomLat] = useState('30.850');
  const [customLon, setCustomLon] = useState('31.050');
  const [customArea, setCustomArea] = useState(25);
  const [isGpsLocating, setIsGpsLocating] = useState(false);

  const handleGps = () => {
    if (navigator.geolocation) {
      setIsGpsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsGpsLocating(false);
          setCustomLat(pos.coords.latitude.toFixed(4));
          setCustomLon(pos.coords.longitude.toFixed(4));
          if (!customName) {
            setCustomName(lang === 'ar' ? 'مزرعتي الحالية (GPS)' : 'My Field (GPS)');
          }
        },
        () => setIsGpsLocating(false),
        { timeout: 8000 }
      );
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(customLat) || 30.85;
    const lonNum = parseFloat(customLon) || 31.05;
    const nameStr = customName || (lang === 'ar' ? `حقل (${latNum}°, ${lonNum}°)` : `Field (${latNum}°, ${lonNum}°)`);
    onSelectCustom(latNum, lonNum, nameStr, customArea);
  };

  return (
    <div className="fixed inset-0 z-[3200] bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="w-full max-w-xl bg-white dark:bg-neutral-900 rounded-3xl p-5 sm:p-8 shadow-2xl border border-black/10 dark:border-white/10 flex flex-col max-h-[90dvh] overflow-hidden">
        {/* Header */}
        <div className="text-center space-y-1.5 pb-4 border-b border-black/5 dark:border-white/5 shrink-0">
          <img
            src="/logo.png"
            alt="BlinkFarms"
            className="w-12 h-12 mx-auto object-contain drop-shadow-sm"
          />
          <h2 className="text-lg sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            {lang === 'ar' ? 'حدد موقع حقلك للبدء' : 'Select or Pin Your Field'}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
            {lang === 'ar'
              ? 'اختر من المشاريع الزراعية القومية الكبرى أو حدد موقع مزرعتك الخاصة بالـ GPS'
              : 'Choose a national benchmark parcel or pin your custom farmland with GPS'}
          </p>

          {/* Mode Switcher */}
          <div className="flex items-center justify-center pt-2">
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setTab('presets')}
                className={`px-4 py-1.5 rounded-xl transition-all ${
                  tab === 'presets'
                    ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-white shadow-sm'
                    : 'text-neutral-500'
                }`}
              >
                {lang === 'ar' ? 'المشاريع القومية (6)' : 'National Projects (6)'}
              </button>
              <button
                onClick={() => setTab('custom')}
                className={`px-4 py-1.5 rounded-xl transition-all ${
                  tab === 'custom'
                    ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-white shadow-sm'
                    : 'text-neutral-500'
                }`}
              >
                {lang === 'ar' ? 'مزرعتي الخاصة (GPS)' : 'Custom Field (GPS)'}
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {tab === 'presets' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEMO_FIELDS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onSelectPreset(preset)}
                  className="p-3.5 rounded-2xl border border-black/5 dark:border-white/10 hover:border-blue-500 bg-neutral-50 dark:bg-neutral-800/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-start transition-all active:scale-95 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate block">
                        {lang === 'ar' ? preset.nameAr : preset.nameEn}
                      </span>
                      {preset.polygonBoundary && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                          {lang === 'ar' ? 'حدود GeoJSON رسمية 🗺️' : 'Official Polygon 🗺️'}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-neutral-400 truncate block mt-0.5">
                      {lang === 'ar' ? preset.locationAr : preset.locationEn}
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium block mt-1">
                      {lang === 'ar' ? preset.cropNameAr : preset.cropNameEn}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-blue-600 shrink-0">➔</span>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <button
                type="button"
                onClick={handleGps}
                disabled={isGpsLocating}
                className="w-full py-3 px-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span>📍</span>
                <span>
                  {isGpsLocating
                    ? (lang === 'ar' ? 'جارٍ تحديد الموقع عبر الأقمار الصناعية...' : 'Locating with GPS...')
                    : (lang === 'ar' ? 'اضغط لتحديد موقعي الحالي تلقائياً عبر الـ GPS' : 'Auto-Detect My Coordinates via GPS')}
                </span>
              </button>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 block">
                  {lang === 'ar' ? 'اسم الحقل أو المزرعة:' : 'Farm Name:'}
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: مزرعة الوادي الأخضر' : 'e.g. Green Valley Parcel 4'}
                  className="w-full px-4 py-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 block">
                    {lang === 'ar' ? 'دائرة العرض (Lat):' : 'Latitude:'}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 block">
                    {lang === 'ar' ? 'خط الطول (Lon):' : 'Longitude:'}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={customLon}
                    onChange={(e) => setCustomLon(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span>{lang === 'ar' ? 'المساحة التقريبية:' : 'Approximate Area:'}</span>
                  <span className="text-blue-600 font-mono">{customArea} {lang === 'ar' ? 'فدان' : 'feddans'}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="500"
                  value={customArea}
                  onChange={(e) => setCustomArea(parseInt(e.target.value))}
                  className="w-full accent-blue-600 h-2"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
              >
                {lang === 'ar' ? 'تأكيد والانطلاق للوحة التحكم ➔' : 'Confirm & Launch Dashboard ➔'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
