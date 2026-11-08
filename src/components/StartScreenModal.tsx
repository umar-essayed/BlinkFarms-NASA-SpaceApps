'use client';

import React, { useState } from 'react';
import { Language } from '@/lib/types';
import { DEMO_FIELDS, FieldPreset } from '@/lib/veloceRootEngine';

interface StartScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSelectPreset: (preset: FieldPreset) => void;
  onLocateMe: () => void;
  onCustomCoords: (lat: number, lon: number, name?: string) => void;
  currentFieldId: string;
}

export default function StartScreenModal({
  isOpen,
  onClose,
  lang,
  onSelectPreset,
  onLocateMe,
  onCustomCoords,
  currentFieldId,
}: StartScreenModalProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'coords'>('presets');
  const [customLat, setCustomLat] = useState('30.850');
  const [customLon, setCustomLon] = useState('31.050');
  const [customName, setCustomName] = useState('');

  if (!isOpen) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);
    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      onCustomCoords(lat, lon, customName || undefined);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Hero */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-blue-50/80 via-white to-white dark:from-neutral-800/80 dark:via-neutral-900 dark:to-neutral-900 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              NASA Space Apps 2026 Challenge
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center text-neutral-500 transition-all text-sm"
              title="Close"
            >
              ✕
            </button>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {lang === 'ar' ? 'مرحباً بك في BlinkFarms' : 'Welcome to BlinkFarms'}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed">
            {lang === 'ar'
              ? 'نظام التنبؤ المبكر بالجفاف الومضي والتخطيط الزراعي المتكيف باستخدام مراصد ناسا الفضائية (ECOSTRESS, SMAP L4, Landsat).'
              : 'Early flash drought warning and adaptive 3-year crop rotation planner powered by NASA Earth observations.'}
          </p>

          {/* Quick GPS Button */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                onLocateMe();
                onClose();
              }}
              className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold shadow-md active:scale-95 transition-all text-sm"
            >
              <span>📍</span>
              {lang === 'ar' ? 'حدد موقع حقلي الآن (GPS)' : 'Locate My Farm (GPS)'}
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-black/5 dark:border-white/10 px-6 pt-2 bg-neutral-50/50 dark:bg-neutral-900/50">
          <button
            onClick={() => setActiveTab('presets')}
            className={`pb-3 px-4 text-xs sm:text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'presets'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'مزارع ومناطق مرجعية' : 'Benchmark Farmlands'}
          </button>
          <button
            onClick={() => setActiveTab('coords')}
            className={`pb-3 px-4 text-xs sm:text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'coords'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'إدخال إحداثيات مخصصة' : 'Custom Coordinates'}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'presets' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEMO_FIELDS.map((preset) => {
                const isSelected = preset.id === currentFieldId;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onSelectPreset(preset);
                      onClose();
                    }}
                    className={`text-start p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
                        : 'border-black/5 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          {lang === 'ar' ? preset.locationAr : preset.locationEn}
                        </span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-neutral-900 dark:text-white">
                        {lang === 'ar' ? preset.nameAr : preset.nameEn}
                      </h4>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
                        {lang === 'ar' ? preset.cropNameAr : preset.cropNameEn}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                      <span>{preset.coordinates[0].toFixed(3)}°N, {preset.coordinates[1].toFixed(3)}°E</span>
                      <span className="font-sans font-semibold text-blue-600 dark:text-blue-400">
                        {lang === 'ar' ? 'اختر ➔' : 'Select ➔'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-4 max-w-md mx-auto py-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {lang === 'ar' ? 'اسم الحقل (اختياري)' : 'Field Name (Optional)'}
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: مزرعة الوادي رقم 3' : 'e.g. My North Field'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    {lang === 'ar' ? 'خط العرض (Latitude)' : 'Latitude'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-mono text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    {lang === 'ar' ? 'خط الطول (Longitude)' : 'Longitude'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={customLon}
                    onChange={(e) => setCustomLon(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-mono text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-semibold rounded-2xl shadow-md active:scale-95 transition-all text-sm"
              >
                {lang === 'ar' ? 'تحليل هذا الموقع بالأقمار الصناعية' : 'Analyze Location with NASA Satellites'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-neutral-50 dark:bg-neutral-900/80 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
          <span className="text-xs text-neutral-500">
            {lang === 'ar' ? 'يمكنك دائماً النقر فوق الخريطة في أي وقت لاختيار موقعك' : 'You can also click directly anywhere on the map anytime.'}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-all"
          >
            {lang === 'ar' ? 'إغلاق ومتابعة' : 'Close & Explore'}
          </button>
        </div>
      </div>
    </div>
  );
}
