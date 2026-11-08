'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Language } from '@/lib/types';

interface SplitComparisonSliderProps {
  lang: Language;
  canopyTempAnomaly: number;
  isShockActive: boolean;
}

export default function SplitComparisonSlider({
  lang,
  canopyTempAnomaly,
  isShockActive,
}: SplitComparisonSliderProps) {
  // Slider position from 0 to 100% (default 50%)
  const [sliderPos, setSliderPos] = useState<number>(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clampedPercent = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPos(clampedPercent);
  }, []);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    handleMove(e.clientX);
  };

  const handlePointerDown = () => {
    isDragging.current = true;
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  return (
    <div className="space-y-3">
      {/* Visual Instruction Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
            <span>⚖️</span>
            <span>
              {lang === 'ar'
                ? 'مقارنة الرصد المزدوج: رادار ناسا الحراري (ESI) مقابل مؤشر الخضار (NDVI)'
                : 'Split Dual-Sensor Comparison: NASA Thermal ESI vs Optical NDVI'}
            </span>
          </h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {lang === 'ar'
              ? 'اسحب الدبوس في المنتصف يميناً ويساراً لترى الفرق بين كشف العطش في اليوم 0 والخضار الخادع'
              : 'Drag the split handle left and right to compare Day-0 thermal deficit vs deceptive optical greenness.'}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-mono font-bold shrink-0">
          <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            ESI (اليوم 0)
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            NDVI (متأخر +14ي)
          </span>
        </div>
      </div>

      {/* Interactive Split Canvas */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onMouseUp={handlePointerUp}
        onTouchEnd={handlePointerUp}
        onMouseLeave={handlePointerUp}
        className="relative w-full h-72 sm:h-80 rounded-3xl overflow-hidden border border-black/10 dark:border-white/10 shadow-lg select-none cursor-ew-resize"
      >
        {/* Layer B (Background / Right Side): Optical NDVI Imagery (Lush Green Deception) */}
        <div className="absolute inset-0 bg-[#0F2015] flex flex-col justify-between p-4 overflow-hidden">
          {/* Simulated Satellite Field Pattern */}
          <div className="absolute inset-0 opacity-80 bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:16px_16px]"></div>
          <div className="absolute inset-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/15 flex items-center justify-center">
            <div className="text-center space-y-1">
              <span className="text-4xl sm:text-5xl">🌾</span>
              <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-emerald-300 font-mono">
                NDVI = 0.78 (يبدو أخضر وطبيعي جداً)
              </div>
              <span className="text-[11px] text-white/70 block max-w-xs px-2">
                {lang === 'ar'
                  ? '⚠️ الكاميرات البصرية تنخدع بلون الكلوروفيل المتبقي؛ النبات يعاني داخلياً من الجفاف لكنه لا يصفر إلا بعد 14-28 يوماً!'
                  : 'Optical sensors are fooled by residual chlorophyll; plants cavitate internally but visual browning lags by 2-4 weeks.'}
              </span>
            </div>
          </div>

          {/* Label Top-Right */}
          <div className="relative z-10 self-end bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md">
            <span>🛰️</span>
            <span>{lang === 'ar' ? 'مؤشر الخضار البصري (NDVI)' : 'Optical NDVI Sensor'}</span>
          </div>
        </div>

        {/* Layer A (Foreground / Left Side, Clipped): BlinkFarms Thermal ESI / Canopy Fever */}
        <div
          style={{ width: `${sliderPos}%` }}
          className="absolute inset-y-0 left-0 overflow-hidden z-20 border-r-2 border-white shadow-2xl transition-none"
        >
          {/* Inner Content matching container width */}
          <div
            style={{ width: containerRef.current ? containerRef.current.clientWidth : '100%' }}
            className={`absolute inset-0 p-4 flex flex-col justify-between ${
              isShockActive ? 'bg-[#3A0A0A]' : 'bg-[#0A1835]'
            }`}
          >
            {/* Thermal Hotspots Mesh */}
            <div
              className={`absolute inset-0 opacity-75 ${
                isShockActive
                  ? 'bg-[radial-gradient(#EF4444_2px,transparent_2px)] [background-size:18px_18px]'
                  : 'bg-[radial-gradient(#3B82F6_2px,transparent_2px)] [background-size:18px_18px]'
              }`}
            ></div>

            {/* Field Stress Geometry */}
            <div
              className={`absolute inset-4 rounded-2xl border-2 ${
                isShockActive
                  ? 'border-red-500 bg-red-600/30'
                  : 'border-blue-500 bg-blue-600/20'
              } flex items-center justify-center`}
            >
              <div className="text-center space-y-1">
                <span className="text-4xl sm:text-5xl">{isShockActive ? '🔥' : '💧'}</span>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                    isShockActive
                      ? 'bg-red-950 text-red-200 border border-red-500/50'
                      : 'bg-blue-950 text-blue-200 border border-blue-500/50'
                  }`}
                >
                  {isShockActive
                    ? `ESI = 0.38 | +${canopyTempAnomaly}°C حمى نتحية!`
                    : `ESI = 0.85 | تبريد نتحي طبيعي`}
                </div>
                <span className="text-[11px] text-white/90 block max-w-xs px-2">
                  {lang === 'ar'
                    ? (isShockActive
                        ? '⚡ رادار ناسا يكتشف انغلاق المسام وارتفاع حرارة الأوراق اليوم، قبل تلف الأوعية!'
                        : '✅ تبريد ذاتي ممتاز وامتصاص مياه متزن بالجذور العميقة.')
                    : (isShockActive
                        ? 'Thermal IR detects stomatal closure and canopy fever on Day 0!'
                        : 'Optimal transpirational cooling and steady root hydration.')}
                </span>
              </div>
            </div>

            {/* Label Top-Left */}
            <div className="relative z-10 self-start bg-blue-950/90 backdrop-blur-md border border-blue-500/40 text-blue-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md">
              <span>⚡</span>
              <span>{lang === 'ar' ? 'رادار ناسا الحراري (ECOSTRESS)' : 'NASA Thermal ESI Radar'}</span>
            </div>
          </div>
        </div>

        {/* Central Split Line & Draggable Knob */}
        <div
          style={{ left: `${sliderPos}%` }}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          className="absolute inset-y-0 -ml-4 w-8 z-30 flex items-center justify-center cursor-ew-resize group"
        >
          {/* Center Dividing White Line */}
          <div className="w-1 h-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]"></div>

          {/* Circular Grab Handle Button */}
          <div className="absolute w-9 h-9 rounded-full bg-white text-neutral-800 shadow-2xl border-2 border-blue-600 flex items-center justify-center font-black text-xs group-hover:scale-110 active:scale-95 transition-transform">
            ↔
          </div>
        </div>
      </div>
    </div>
  );
}
