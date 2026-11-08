'use client';

import React from 'react';
import { Language } from '@/lib/types';

export interface TelemetryPipelineHUDProps {
  lang: Language;
  isVisible: boolean;
  currentPhase: number; // 1, 2, 3, 4
  onDismiss?: () => void;
}

export default function TelemetryPipelineHUD({
  lang,
  isVisible,
  currentPhase,
  onDismiss,
}: TelemetryPipelineHUDProps) {
  if (!isVisible) return null;

  const PHASES_AR = [
    { id: 1, label: 'المرحلة 1: جلب حزم ناسا (ECOSTRESS TIR + SMAP L4)...', sub: 'دقة 70 متراً حرارياً ورطوبة التربة حتى عمق 100 سم' },
    { id: 2, label: 'المرحلة 2: استخراج حرارة مسام الأوراق وشذوذ الحمى (+Tc)...', sub: 'مقارنة درجة حرارة المجموع الخضري بالهواء الجوي المحيط' },
    { id: 3, label: 'المرحلة 3: موازنة رطوبة الجذور FAO-56 وتحديد عمق العجز...', sub: 'حساب النتح التبخري ومعامل المحصول واحتياج الري اليومي' },
    { id: 4, label: 'المرحلة 4: اكتمال الاتزان الفيزيائي وحساب قرار الري النهائي.', sub: 'تحديث بيانات الحقل والإنذار المبكر لحظياً' },
  ];

  const PHASES_EN = [
    { id: 1, label: 'Phase 1: Ingesting NASA ECOSTRESS TIRS + SMAP L4 bands...', sub: '70m thermal resolution & 0-100cm root zone soil moisture' },
    { id: 2, label: 'Phase 2: Extracting Canopy LST & Fever Anomaly (+Tc)...', sub: 'Comparing leaf surface infrared temperature vs ambient boundary' },
    { id: 3, label: 'Phase 3: Solving FAO-56 Root Hydration & Deficit...', sub: 'Solving Penman-Monteith energy balance & daily irrigation depth' },
    { id: 4, label: 'Phase 4: Dynamic Physical Equilibrium reached.', sub: 'Field memory vector calibrated & telemetry updated in real time' },
  ];

  const phases = lang === 'ar' ? PHASES_AR : PHASES_EN;
  const progressPercent = Math.min(100, Math.round((currentPhase / 4) * 100));

  return (
    <div className="fixed top-20 inset-x-3 sm:inset-x-auto sm:right-6 sm:w-96 z-[3000] animate-slideUp pointer-events-none">
      <div className="pointer-events-auto bg-neutral-900/95 dark:bg-black/95 text-white backdrop-blur-2xl border border-white/15 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-600/30 border border-blue-400/50 flex items-center justify-center text-xs animate-spin">
              🛰️
            </div>
            <div>
              <h4 className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
                <span>{lang === 'ar' ? 'منظومة معالجة بيانات ناسا الحية' : 'Live NASA Telemetry Ingestion'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
              </h4>
              <span className="text-[10px] font-mono text-neutral-400">
                ECOSTRESS • SMAP L4 • PT-JPL
              </span>
            </div>
          </div>

          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-blue-600/30 text-blue-300 border border-blue-500/30">
            {progressPercent}%
          </span>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            style={{ width: `${progressPercent}%` }}
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-300 rounded-full"
          />
        </div>

        {/* 4 Phases Stepper List */}
        <div className="space-y-2 pt-1">
          {phases.map((p) => {
            const isCompleted = currentPhase > p.id;
            const isCurrent = currentPhase === p.id;
            const isPending = currentPhase < p.id;

            return (
              <div
                key={p.id}
                className={`flex items-start gap-2.5 text-xs transition-opacity ${
                  isPending ? 'opacity-40' : 'opacity-100'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {isCompleted ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </div>
                  ) : isCurrent ? (
                    <div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] animate-pulse">
                      ●
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-white/30 flex items-center justify-center text-[9px] text-white/50">
                      {p.id}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <span
                    className={`block font-semibold text-[11px] leading-tight ${
                      isCurrent
                        ? 'text-blue-300 font-bold'
                        : isCompleted
                        ? 'text-emerald-300'
                        : 'text-neutral-400'
                    }`}
                  >
                    {p.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] text-neutral-400 block mt-0.5 leading-snug">
                      {p.sub}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
