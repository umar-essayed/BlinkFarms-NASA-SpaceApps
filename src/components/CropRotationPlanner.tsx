'use client';

import React, { useState } from 'react';
import { RotationStrategy, RotationSeason, Language } from '@/lib/types';
import ProvenanceBadge from './ProvenanceBadge';

interface CropRotationPlannerProps {
  strategies: RotationStrategy[];
  selectedStrategyId: 'balanced' | 'water_saving' | 'current';
  onSelectStrategy: (id: 'balanced' | 'water_saving' | 'current') => void;
  areaFeddan: number;
  fieldName: string;
  lang: Language;
  onOpenWizard?: () => void;
  whatIfWaterCutPercent: number;
  setWhatIfWaterCutPercent: (val: number) => void;
  whatIfHeatwaveC: number;
  setWhatIfHeatwaveC: (val: number) => void;
}

export default function CropRotationPlanner({
  strategies,
  selectedStrategyId,
  onSelectStrategy,
  areaFeddan,
  fieldName,
  lang,
  onOpenWizard,
  whatIfWaterCutPercent,
  setWhatIfWaterCutPercent,
  whatIfHeatwaveC,
  setWhatIfHeatwaveC,
}: CropRotationPlannerProps) {
  const [showClimateSimulator, setShowClimateSimulator] = useState(false);
  const [activeSeasonIndex, setActiveSeasonIndex] = useState<number>(0);
  const [activeBlueprintTab, setActiveBlueprintTab] = useState<'sowing' | 'fertilizer' | 'economics' | 'soil'>('sowing');

  const activeStrategy =
    strategies.find((s) => s.id === selectedStrategyId) || strategies[0];

  // Flatten all 6 seasons into an easy sequential list
  const allSeasons: { season: RotationSeason; yearNum: number; seasonType: 'winter' | 'summer' }[] = [];
  activeStrategy.years.forEach((y) => {
    if (y.seasons?.[0]) {
      allSeasons.push({ season: y.seasons[0], yearNum: y.year, seasonType: 'winter' });
    }
    if (y.seasons?.[1]) {
      allSeasons.push({ season: y.seasons[1], yearNum: y.year, seasonType: 'summer' });
    }
  });

  const nextImmediateSeason = allSeasons[0]?.season;
  const currentSelectedSeason = allSeasons[activeSeasonIndex]?.season || nextImmediateSeason;
  const egyptianProfile = currentSelectedSeason?.crop.egyptianProfile;
  const certifiedCultivar = currentSelectedSeason?.selectedCultivar || egyptianProfile?.certifiedCultivars?.[0];

  // Total parcel profit calculation (convert USD/ha to realistic EGP/feddan using official 49 EGP exchange rate: 1 ha = 2.38 feddan)
  const totalEgpPerFeddan = Math.round((activeStrategy.totalNetProfitUsdHa || 2400) * (49 / 2.3809));
  const totalParcelEgp = Math.round(totalEgpPerFeddan * areaFeddan);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 1. TOP HEADER & GOAL SELECTOR */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔄</span>
              <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <span>{lang === 'ar' ? 'الدورة الزراعية الذكية والتعاقب المحصولي' : 'Smart Crop Rotation Planner'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                  FIELDSHIFT V2
                </span>
              </h2>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {lang === 'ar'
                ? `مبنية ومحاكية خصيصاً لـ ${fieldName} (${areaFeddan} فدان) بأصناف وزارة الزراعة المصرية وحسابات FAO-56.`
                : `Tailored and biophysically simulated for ${fieldName} (${areaFeddan} feddans) with certified Egyptian cultivars.`}
            </p>
          </div>

          {onOpenWizard && (
            <button
              onClick={onOpenWizard}
              className="self-start sm:self-auto px-3.5 py-1.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>⚙️</span>
              <span>{lang === 'ar' ? 'تعديل تاريخ الأرض ومحاصيلك' : 'Edit Farm History'}</span>
            </button>
          )}
        </div>

        {/* The 3 Clear Strategy Cards (1-Click Goal Switcher) */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
            {lang === 'ar' ? 'اختر هدفك للدورة الزراعية:' : 'Choose Your Farming Goal:'}
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {strategies.map((strat) => {
              const isSelected = selectedStrategyId === strat.id;

              return (
                <button
                  key={strat.id}
                  onClick={() => onSelectStrategy(strat.id as any)}
                  className={`p-3.5 rounded-2xl text-right transition-all border active:scale-98 flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-neutral-50 dark:bg-[#16161C] hover:bg-neutral-100 dark:hover:bg-white/5 border-black/5 dark:border-white/5 text-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-lg">
                      {strat.id === 'balanced' && '⚖️'}
                      {strat.id === 'water_saving' && '💧'}
                      {strat.id === 'current' && '⚠️'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-black/5 dark:bg-white/10 text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      {strat.id === 'balanced'
                        ? (lang === 'ar' ? 'الموصى بها ⭐' : 'Recommended ⭐')
                        : strat.id === 'water_saving'
                        ? (lang === 'ar' ? 'توفير مياه 38%' : 'Max Water Saver')
                        : (lang === 'ar' ? 'الوضع القائم' : 'Current Baseline')}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs sm:text-sm font-extrabold">
                      {strat.id === 'balanced'
                        ? (lang === 'ar' ? 'الدورة المتوازنة' : 'Balanced Cycle')
                        : strat.id === 'water_saving'
                        ? (lang === 'ar' ? 'دورة الأمان المائي' : 'Water-Saving Cycle')
                        : (lang === 'ar' ? 'الزراعة التقليدية' : 'Traditional Baseline')}
                    </h3>
                    <p
                      className={`text-[11px] leading-snug mt-1 ${
                        isSelected ? 'text-white/90' : 'text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      {strat.id === 'balanced'
                        ? (lang === 'ar' ? 'توازن مثالي بين أعلى عائد نقدي وتغذية التربة بكسر دورات الآفات' : 'Balances high margins with biological nitrogen replenishment')
                        : strat.id === 'water_saving'
                        ? (lang === 'ar' ? 'ترشيد استهلاك المياه والاعتماد على محاصيل تتحمل الجفاف والحرارة' : 'Maximum water saving using deep-rooted drought tolerant crops')
                        : (lang === 'ar' ? 'زراعة أحادية مكررة تستنزف خصوبة الأرض وتحتاج كيماوي مكثف' : 'Monoculture that exhausts soil fertility and requires heavy synthetic urea')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. TOTAL 3-YEAR GAINS & ROI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Gain 1: Water Savings */}
        <div className="p-4 rounded-3xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block">
              {lang === 'ar' ? '💧 إجمالي وفورات مياه الري' : 'Net Water Saved (3 Years)'}
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
              -{activeStrategy.totalWaterSavedPercent}%
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
            {activeStrategy.totalWaterSavedM3Feddan.toLocaleString()} <span className="text-xs font-bold">{lang === 'ar' ? 'م³ / فدان' : 'm³/fed'}</span>
          </div>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
            {lang === 'ar'
              ? `إجمالي حيازتك (${areaFeddan} فدان): توفير ${(activeStrategy.totalWaterSavedM3Feddan * areaFeddan).toLocaleString()} م³ مياه.`
              : `Total parcel (${areaFeddan} fed): saves ${(activeStrategy.totalWaterSavedM3Feddan * areaFeddan).toLocaleString()} m³ irrigation water.`}
          </p>
        </div>

        {/* Gain 2: Fertilizer Savings */}
        <div className="p-4 rounded-3xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block">
              {lang === 'ar' ? '🌾 وفر أسمدة اليوريا والكيماوي' : 'Urea Fertilizer Saved'}
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {activeStrategy.totalUreaBagsSavedPerFeddan} {lang === 'ar' ? 'شكارة/فدان' : 'bags/fed'}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            ~{activeStrategy.totalFertilizerSavingsEgp.toLocaleString()} <span className="text-xs font-bold">{lang === 'ar' ? 'جنيه / فدان' : 'EGP/fed'}</span>
          </div>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
            {lang === 'ar'
              ? `وفر مالي مباشر من تثبيت النيتروجين الحيوي (سعر السوق 950 ج/شكارة).`
              : `Direct financial savings from biological N-fixation (market rate 950 EGP/bag).`}
          </p>
        </div>

        {/* Gain 3: Soil Bio-drilling & Hardpan */}
        <div className="p-4 rounded-3xl bg-purple-50/80 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block">
              {lang === 'ar' ? '🚜 تفكيك كتمة باطن التربة (Hardpan)' : 'Subsoil Bio-Drilling'}
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
              {activeStrategy.biodrillingRemediated ? 'REMEDIATED' : 'MAINTAINED'}
            </span>
          </div>
          <div className="text-sm sm:text-base font-black text-neutral-900 dark:text-white pt-1">
            {activeStrategy.biodrillingRemediated
              ? (lang === 'ar' ? '✅ تم تفكيكها طبيعياً بالجذور الوتدية' : '✅ Remediated via taproots')
              : (lang === 'ar' ? 'نفاذية مثالية وباطن مفكك' : 'Optimal permeability maintained')}
          </div>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
            {lang === 'ar'
              ? 'توفير تكلفة استئجار جرار الحرث تحت التربة وتنشيط الصرف الطبيعي.'
              : 'Saves tractor subsoiling rentals and restores deep drainage.'}
          </p>
        </div>
      </div>

      {/* 3. 3-YEAR (6-SEASON) INTERACTIVE VISUAL TIMELINE */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 dark:border-white/10 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <span>📅</span>
              <span>{lang === 'ar' ? 'خريطة التعاقب الزمني للـ 3 سنوات (6 عروات متتالية بالأصناف المعتمدة)' : '3-Year Succession Timeline (6 Seasons with Certified Cultivars)'}</span>
            </h3>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {lang === 'ar' ? 'اضغط على أي عروة لفتح بطاقة التشغيل الزراعي المعتمدة والتوصيات الإرشادية' : 'Click on any season to open its certified agronomic field manual'}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-2xl self-start sm:self-auto">
            <span>{lang === 'ar' ? `صافي أرباح الحقل المقدرة:` : 'Est. Field Net Margin:'}</span>
            <span className="text-sm font-black">{totalParcelEgp.toLocaleString()} ج.م</span>
          </div>
        </div>

        {/* 6 Sequential Timeline Badges / Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          {allSeasons.map((item, idx) => {
            const isWinter = item.seasonType === 'winter';
            const isActive = activeSeasonIndex === idx;
            const profile = item.season.crop.egyptianProfile;
            const cultivarName = item.season.selectedCultivar?.nameAr || profile?.certifiedCultivars?.[0]?.nameAr;

            return (
              <button
                key={idx}
                onClick={() => setActiveSeasonIndex(idx)}
                className={`p-3 rounded-2xl text-right transition-all border active:scale-95 flex flex-col justify-between min-h-[125px] ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-neutral-50 dark:bg-[#16161C] hover:bg-neutral-100 dark:hover:bg-white/5 border-black/5 dark:border-white/5 text-neutral-800 dark:text-neutral-200'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : isWinter
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                      : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                  }`}>
                    {isWinter ? (lang === 'ar' ? 'شتوي' : 'Winter') : (lang === 'ar' ? 'صيفي' : 'Summer')}
                  </span>
                  <span className="text-[10px] font-mono opacity-70">
                    {lang === 'ar' ? `س${item.yearNum}` : `Y${item.yearNum}`}
                  </span>
                </div>

                <div className="my-1.5">
                  <h4 className="text-xs sm:text-sm font-black truncate">
                    {lang === 'ar' ? item.season.crop.nameAr : item.season.crop.nameEn}
                  </h4>
                  {cultivarName && (
                    <span className={`text-[10px] block font-bold truncate mt-0.5 ${isActive ? 'text-blue-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {cultivarName.split(' ')[0]} {cultivarName.split(' ')[1] || ''}
                    </span>
                  )}
                  <span className={`text-[10px] block mt-0.5 ${isActive ? 'text-blue-100' : 'text-neutral-400'}`}>
                    💧 {Math.round(item.season.seasonalWaterNeedM3Ha * 0.42)} م³/ف
                  </span>
                </div>

                <div className="flex items-center justify-between text-[9px] font-semibold w-full">
                  <span className={isActive ? 'text-blue-200' : 'text-neutral-500'}>
                    {profile ? `${profile.expectedYieldPerFeddan.average} ${profile.traditionalUnitAr}/ف` : 'إنتاج ممتاز'}
                  </span>
                  {item.season.soilNitrogenDeltaKgHa > 0 && (
                    <span className={`px-1 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                      +N
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* 4. EXECUTIVE AGRONOMIC BLUEPRINT FOR SELECTED SEASON */}
        {currentSelectedSeason && (
          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 dark:bg-[#16161C] border border-black/5 dark:border-white/10 space-y-4 animate-fadeIn">
            {/* Header: Selected Season Identity */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 dark:border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {currentSelectedSeason.seasonType === 'winter' ? '❄️' : '☀️'}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                      {lang === 'ar'
                        ? `العروة ${activeSeasonIndex + 1}: ${currentSelectedSeason.crop.nameAr}`
                        : `Season ${activeSeasonIndex + 1}: ${currentSelectedSeason.crop.nameEn}`}
                    </h4>
                    {certifiedCultivar && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-sm">
                        {certifiedCultivar.nameAr}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-500 mt-0.5 block">
                    {lang === 'ar'
                      ? `السنة ${allSeasons[activeSeasonIndex].yearNum} • عائلة ${currentSelectedSeason.crop.familyNameAr} • دورة موثقة بوزارة الزراعة`
                      : `Year ${allSeasons[activeSeasonIndex].yearNum} • Family: ${currentSelectedSeason.crop.familyNameEn}`}
                  </span>
                </div>
              </div>

              {/* 4 Blueprint Navigation Tabs */}
              <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-2xl self-start sm:self-auto">
                <button
                  onClick={() => setActiveBlueprintTab('sowing')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                    activeBlueprintTab === 'sowing' ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  {lang === 'ar' ? '🌱 التقاوي والزراعة' : '🌱 Sowing'}
                </button>
                <button
                  onClick={() => setActiveBlueprintTab('fertilizer')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                    activeBlueprintTab === 'fertilizer' ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  {lang === 'ar' ? '🌾 التسميد والري' : '🌾 Fertilizer & Water'}
                </button>
                <button
                  onClick={() => setActiveBlueprintTab('economics')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                    activeBlueprintTab === 'economics' ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  {lang === 'ar' ? '💰 الجدوى والأرباح' : '💰 Economics'}
                </button>
                <button
                  onClick={() => setActiveBlueprintTab('soil')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                    activeBlueprintTab === 'soil' ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  {lang === 'ar' ? '🌍 أثر التربة' : '🌍 Soil Impact'}
                </button>
              </div>
            </div>

            {/* TAB 1: SOWING & CULTIVARS */}
            {activeBlueprintTab === 'sowing' && (
              <div className="space-y-3 animate-fadeIn text-xs">
                {certifiedCultivar && (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-neutral-900 dark:text-white text-sm">
                        {certifiedCultivar.nameAr}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-neutral-400">
                        كود الاعتماد: {certifiedCultivar.registrationCode}
                      </span>
                    </div>
                    <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      {certifiedCultivar.featuresAr}
                    </p>
                    <div className="flex items-center gap-4 text-[11px] font-semibold text-neutral-500 pt-1">
                      <span>⏳ مدة النضج: {certifiedCultivar.maturityDays} يوماً</span>
                      <span>•</span>
                      <span>🧂 تحمل الملوحة: حتى {certifiedCultivar.salinityToleranceDsM} dS/m</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/5 space-y-1">
                    <span className="font-bold text-neutral-800 dark:text-neutral-200 block text-[11px]">
                      📅 مواعيد الزراعة الرسمية المعتمدة:
                    </span>
                    <p className="text-neutral-600 dark:text-neutral-300 leading-snug">
                      {egyptianProfile?.sowingWindows.deltaAr || '15 نوفمبر إلى 30 نوفمبر (أفضل ميعاد بالدلتا)'}
                    </p>
                    <span className="text-[10px] text-neutral-400 block mt-1">
                      الصعيد والوجه القبلي: {egyptianProfile?.sowingWindows.upperEgyptAr || '10 إلى 25 نوفمبر'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/5 space-y-1">
                    <span className="font-bold text-neutral-800 dark:text-neutral-200 block text-[11px]">
                      ⚖️ معدل التقاوي وطريقة الزراعة:
                    </span>
                    <p className="text-neutral-600 dark:text-neutral-300 font-bold">
                      {egyptianProfile?.seedRatePerFeddan.amount || '45 - 50 كجم تقاوي منتقاة للفدان'}
                    </p>
                    <span className="text-[10px] text-neutral-500 block leading-snug mt-1">
                      {egyptianProfile?.seedRatePerFeddan.methodAr || 'الزراعة بالسطارة على مصاطب توفر 20% من مياه الري.'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FERTILIZER SCHEDULE & WATER */}
            {activeBlueprintTab === 'fertilizer' && (
              <div className="space-y-3 animate-fadeIn text-xs">
                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-900/30">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💧</span>
                    <div>
                      <span className="font-bold text-neutral-900 dark:text-white block">
                        الاحتياج المائي الفصلي للعروة: {Math.round(currentSelectedSeason.seasonalWaterNeedM3Ha * 0.42)} م³/فدان
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        محسوبة بنموذج FAO-56 المزدوج مع مراعاة الرطوبة المتبقية من المحصول السابق.
                      </span>
                    </div>
                  </div>
                  {currentSelectedSeason.nitrogenCreditReceivedKgHa > 0 && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg">
                      +{currentSelectedSeason.nitrogenCreditReceivedKgHa} كجم N حيوي موروث
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 block text-xs">
                    جدول دفعات التسميد NPK المرحلية المعتمدة للفدان:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {egyptianProfile?.phasedFertilizerSchedule?.map((stage, sIdx) => (
                      <div key={sIdx} className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {stage.stageNameAr}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400">
                            {stage.daysAfterSowing}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-neutral-900 dark:text-white pt-0.5">
                          {stage.ureaBagsPerFeddan > 0 && (
                            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">
                              {stage.ureaBagsPerFeddan} شيكارة يوريا
                            </span>
                          )}
                          {stage.superphosphateBagsPerFeddan > 0 && (
                            <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                              {stage.superphosphateBagsPerFeddan} شيكارة فوسفات
                            </span>
                          )}
                          {stage.potassiumSulfateKgPerFeddan > 0 && (
                            <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded">
                              {stage.potassiumSulfateKgPerFeddan} كجم بوتاسيوم
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 pt-0.5 leading-snug">
                          {stage.notesAr}
                        </p>
                      </div>
                    )) || (
                      <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border text-neutral-500">
                        برنامج التسميد القياسي: 2 شيكارة سوبر فوسفات بالخدمة، 3 شكاير يوريا مقسمة على ريتين، 25 كجم سلفات بوتاسيوم.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ECONOMICS & ROI */}
            {activeBlueprintTab === 'economics' && (
              <div className="space-y-3 animate-fadeIn text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/5 space-y-1">
                    <span className="text-neutral-400 font-bold block text-[11px]">الإنتاجية المتوقعة:</span>
                    <div className="text-lg font-black text-neutral-900 dark:text-white font-mono">
                      {egyptianProfile ? `${egyptianProfile.expectedYieldPerFeddan.average} ${egyptianProfile.traditionalUnitAr}` : '22 إردب'}
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      تعادل {egyptianProfile?.expectedYieldPerFeddan.metricTonsAverage || 3.3} طن للفدان
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/5 space-y-1">
                    <span className="text-neutral-400 font-bold block text-[11px]">تكلفة الإنتاج للفدان:</span>
                    <div className="text-lg font-black text-rose-600 font-mono">
                      {egyptianProfile ? `${egyptianProfile.economicsEgp.productionCostPerFeddan.toLocaleString()} ج` : '14,500 ج'}
                    </div>
                    <span className="text-[10px] text-neutral-400">تقاوي + خدمة + سماد + ري</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/5 space-y-1">
                    <span className="text-neutral-400 font-bold block text-[11px]">الإيراد الإجمالي للفدان:</span>
                    <div className="text-lg font-black text-blue-600 font-mono">
                      {egyptianProfile ? `${egyptianProfile.economicsEgp.grossRevenuePerFeddan.toLocaleString()} ج` : '44,000 ج'}
                    </div>
                    <span className="text-[10px] text-neutral-400">بسعر التوريد/السوق الحر</span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 space-y-1">
                    <span className="text-emerald-700 dark:text-emerald-300 font-bold block text-[11px]">صافي الربح للفدان:</span>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {egyptianProfile ? `+${egyptianProfile.economicsEgp.netProfitPerFeddan.toLocaleString()} ج` : '+29,500 ج'}
                    </div>
                    <span className="text-[10px] text-emerald-600">
                      إجمالي أرضك ({areaFeddan} ف): {((egyptianProfile?.economicsEgp.netProfitPerFeddan || 29500) * areaFeddan).toLocaleString()} ج
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SOIL SYNERGY */}
            {activeBlueprintTab === 'soil' && (
              <div className="space-y-3 animate-fadeIn text-xs">
                <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/5 space-y-2">
                  <span className="font-bold text-neutral-900 dark:text-white block text-sm">
                    💡 سر اختيار هذا المحصول في هذا التوقيت للتربة:
                  </span>
                  <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed text-xs">
                    {currentSelectedSeason.transitionReasonAr}
                  </p>
                  {egyptianProfile?.soilSynergyNoteAr && (
                    <p className="text-neutral-500 text-[11px] leading-relaxed border-t border-black/5 dark:border-white/5 pt-2">
                      🌿 <span className="font-bold">أثر المادة العضوية والجذور:</span> {egyptianProfile.soilSynergyNoteAr}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. COLLAPSIBLE ADVANCED CLIMATE STRESS SIMULATOR (WHAT-IF RESILIENCE) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-neutral-100 dark:bg-neutral-900/80 border border-black/5 dark:border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowClimateSimulator(!showClimateSimulator)}
            className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-neutral-800 dark:text-neutral-200 hover:text-amber-600 transition-colors"
          >
            <span>🧪</span>
            <span>{lang === 'ar' ? 'محاكي الإجهاد المناخي ونقص المياه (أرصاد ناسا الفضائية)' : 'NASA Climate Stress Simulator (What-If)'}</span>
            <span className="text-[10px] text-neutral-400">
              {showClimateSimulator ? '▲ إغلاق' : '▼ فتح المحاكي'}
            </span>
          </button>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
            NASA POWER COUPLED
          </span>
        </div>

        {showClimateSimulator && (
          <div className="space-y-4 pt-2 border-t border-black/5 dark:border-white/5 animate-fadeIn">
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {lang === 'ar'
                ? 'جرب تأثير انخفاض حصة المياه أو حدوث موجة حرارية شديدة على استجابة الدورة الزراعية وتحول المحاصيل تلقائياً:'
                : 'Simulate how the biophysical engine dynamically pivots crop choices under water cuts and extreme heat:'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Slider 1: Water Cut */}
              <div className="space-y-1.5 bg-white/70 dark:bg-black/30 p-3 rounded-2xl border border-black/5 dark:border-white/5">
                <div className="flex justify-between text-xs font-bold">
                  <span>{lang === 'ar' ? 'عجز حصة مياه الري:' : 'Water Quota Cut:'}</span>
                  <span className="font-mono text-amber-600 font-extrabold">
                    {whatIfWaterCutPercent > 0 ? `-${whatIfWaterCutPercent}%` : (lang === 'ar' ? 'طبيعي' : 'Baseline')}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="5"
                  value={whatIfWaterCutPercent}
                  onChange={(e) => setWhatIfWaterCutPercent(parseInt(e.target.value))}
                  className="w-full accent-amber-500 h-2 cursor-pointer"
                />
              </div>

              {/* Slider 2: Heatwave */}
              <div className="space-y-1.5 bg-white/70 dark:bg-black/30 p-3 rounded-2xl border border-black/5 dark:border-white/5">
                <div className="flex justify-between text-xs font-bold">
                  <span>{lang === 'ar' ? 'موجة حرارية صيفية:' : 'Summer Heatwave:'}</span>
                  <span className="font-mono text-rose-600 font-extrabold">
                    {whatIfHeatwaveC > 0 ? `+${whatIfHeatwaveC}°C` : (lang === 'ar' ? 'معدل ناسا الطبيعي' : 'Normal')}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="1"
                  value={whatIfHeatwaveC}
                  onChange={(e) => setWhatIfHeatwaveC(parseInt(e.target.value))}
                  className="w-full accent-rose-500 h-2 cursor-pointer"
                />
              </div>
            </div>

            {/* Scientific Provenance Summary */}
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/40 border border-black/5 dark:border-white/5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-900 dark:text-white">
                <span>{lang === 'ar' ? 'السند العلمي وأرصاد ناسا الفضائية:' : 'NASA Earth Observation Evidence:'}</span>
                <ProvenanceBadge
                  state="SIMULATED"
                  source="NASA POWER + SMAP + Landsat"
                  resolution="30m - 0.5°"
                  lang={lang}
                />
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {lang === 'ar' ? activeStrategy.evidenceSummaryAr : activeStrategy.evidenceSummaryEn}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
