'use client';

import React, { useState } from 'react';
import { Language } from '@/lib/types';
import { UserPriorities } from '@/lib/fieldShiftEngine';
import { FieldMemoryState } from '@/lib/types';

export interface WizardAnswers {
  previousCrop: string;
  soilType: string;
  irrigationType: string;
  subsoilIssue: string;
  primaryPriority: 'water' | 'profit' | 'soil' | 'resilience';
  areaFeddan: number;
  marketTarget: 'local' | 'export';
}

interface AgronomicWizardProps {
  lang: Language;
  onComplete: (answers: WizardAnswers, updatedPriorities: UserPriorities, updatedMemory: Partial<FieldMemoryState>) => void;
  onCancel?: () => void;
}

export default function AgronomicWizard({
  lang,
  onComplete,
  onCancel,
}: AgronomicWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [previousCrop, setPreviousCrop] = useState('berseem');
  const [soilType, setSoilType] = useState('clay_loam');
  const [irrigationType, setIrrigationType] = useState('drip');
  const [subsoilIssue, setSubsoilIssue] = useState('none');
  const [primaryPriority, setPrimaryPriority] = useState<'water' | 'profit' | 'soil' | 'resilience'>('water');
  const [areaFeddan, setAreaFeddan] = useState(15);
  const [marketTarget, setMarketTarget] = useState<'local' | 'export'>('local');

  const TOTAL_STEPS = 5;

  const handleFinish = () => {
    // Derive Priorities from primary selection
    let priorities: UserPriorities = {
      profitWeight: 0.25,
      waterWeight: 0.35,
      soilHealthWeight: 0.25,
      climateRiskWeight: 0.15,
    };

    if (primaryPriority === 'water') {
      priorities = { profitWeight: 0.15, waterWeight: 0.55, soilHealthWeight: 0.15, climateRiskWeight: 0.15 };
    } else if (primaryPriority === 'profit') {
      priorities = { profitWeight: 0.55, waterWeight: 0.20, soilHealthWeight: 0.15, climateRiskWeight: 0.10 };
    } else if (primaryPriority === 'soil') {
      priorities = { profitWeight: 0.15, waterWeight: 0.20, soilHealthWeight: 0.55, climateRiskWeight: 0.10 };
    } else if (primaryPriority === 'resilience') {
      priorities = { profitWeight: 0.15, waterWeight: 0.25, soilHealthWeight: 0.15, climateRiskWeight: 0.45 };
    }

    // Derive Field Memory from Answers
    const memoryUpdates: Partial<FieldMemoryState> = {
      previousCropId: previousCrop,
      hardpanDetected: subsoilIssue === 'hardpan',
      salinityRiskLevel: subsoilIssue === 'salinity' ? 'moderate' : 'normal',
      carryoverWaterFraction: irrigationType === 'drip' ? 0.70 : (irrigationType === 'pivot' ? 0.60 : 0.45),
      soilErrorIndex: subsoilIssue === 'hardpan' ? 1.45 : (subsoilIssue === 'salinity' ? 1.30 : 0.85),
    };

    const answers: WizardAnswers = {
      previousCrop,
      soilType,
      irrigationType,
      subsoilIssue,
      primaryPriority,
      areaFeddan,
      marketTarget,
    };

    onComplete(answers, priorities, memoryUpdates);
  };

  return (
    <div className="space-y-6 animate-fadeIn py-2">
      {/* Top Header & Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-2xl bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
              {currentStep}/{TOTAL_STEPS}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              {lang === 'ar' ? 'تحديد خصائص الأرض والدورة الزراعية' : 'Field Soil & Rotation Setup'}
            </h3>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-neutral-200/60 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-all"
            >
              ✕
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-neutral-200/70 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
          ></div>
        </div>
      </div>

      {/* QUESTION 1: Current / Previous Crop */}
      {currentStep === 1 && (
        <div className="space-y-4 animate-fadeIn">
          <h4 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
            {lang === 'ar' ? 'ما هو المحصول السابق أو المزروع حالياً في أرضك؟' : 'What is the current or previous crop in this field?'}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'berseem', icon: '🍀', nameAr: 'برسيم (مصري / حجازي)', nameEn: 'Berseem / Alfalfa', tagAr: 'مُثبت للنيتروجين ومصلح للتربة', tagEn: 'Nitrogen fixer' },
              { id: 'maize', icon: '🌽', nameAr: 'ذرة شامية (صيفية)', nameEn: 'Summer Maize', tagAr: 'مستهلك عالي للنيتروجين والمياه', tagEn: 'High N feeder' },
              { id: 'wheat', icon: '🌾', nameAr: 'قمح شتوي (حبوب)', nameEn: 'Winter Wheat', tagAr: 'استنزاف متوسط للرطوبة', tagEn: 'Moderate N drain' },
              { id: 'cotton', icon: '⚪', nameAr: 'قطن طويل التيلة', nameEn: 'Cotton', tagAr: 'جذور عميقة ومجهد للبوتاسيوم', tagEn: 'Deep taproot' },
              { id: 'tomato', icon: '🍅', nameAr: 'طماطم وخضروات مكثفة', nameEn: 'Vegetables / Tomato', tagAr: 'أسمدة مكثفة ومخاطر نيماتودا', tagEn: 'High input load' },
              { id: 'fallow', icon: '🍂', nameAr: 'أرض بور (فترة راحة)', nameEn: 'Fallow / Rest', tagAr: 'استعادة وتجميع رطوبة باطنية', tagEn: 'Moisture recharge' },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setPreviousCrop(c.id)}
                className={`p-4 rounded-2xl text-start flex items-center justify-between gap-3 transition-all active:scale-[0.98] ${
                  previousCrop === c.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white dark:bg-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-800 shadow-sm border border-black/5 dark:border-white/5'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-2xl">{c.icon}</span>
                  <div>
                    <span className="text-sm font-bold block">
                      {lang === 'ar' ? c.nameAr : c.nameEn}
                    </span>
                    <span className={`text-xs block mt-0.5 ${previousCrop === c.id ? 'text-blue-100' : 'text-neutral-400'}`}>
                      {lang === 'ar' ? c.tagAr : c.tagEn}
                    </span>
                  </div>
                </div>
                {previousCrop === c.id && <span className="text-white font-bold text-base">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* QUESTION 2: Irrigation & Soil Texture */}
      {currentStep === 2 && (
        <div className="space-y-5 animate-fadeIn">
          <h4 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
            {lang === 'ar' ? 'ما هي طريقة الري ونوعية التربة السائدة؟' : 'What is the irrigation system and soil type?'}
          </h4>

          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-2.5">
                {lang === 'ar' ? 'نظام الري:' : 'Irrigation Method:'}
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'drip', icon: '💧', nameAr: 'تنقيط حديث', nameEn: 'Drip' },
                  { id: 'pivot', icon: '🔄', nameAr: 'رشاش محوري', nameEn: 'Pivot' },
                  { id: 'flood', icon: '🌊', nameAr: 'غمر تقليدي', nameEn: 'Flood' },
                ].map((ir) => (
                  <button
                    key={ir.id}
                    onClick={() => setIrrigationType(ir.id)}
                    className={`p-3.5 rounded-2xl text-center transition-all active:scale-95 flex flex-col items-center gap-1.5 ${
                      irrigationType === ir.id
                        ? 'bg-blue-600 text-white font-bold shadow-md'
                        : 'bg-white dark:bg-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-800 shadow-sm border border-black/5 dark:border-white/5'
                    }`}
                  >
                    <span className="text-2xl">{ir.icon}</span>
                    <span className="text-xs font-bold">{lang === 'ar' ? ir.nameAr : ir.nameEn}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-2.5">
                {lang === 'ar' ? 'نوعية التربة:' : 'Soil Texture:'}
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'clay_loam', nameAr: 'طميية نيلية خصبة', nameEn: 'Alluvial Loam' },
                  { id: 'sandy', nameAr: 'صحراوية رملية', nameEn: 'Sandy Soil' },
                  { id: 'heavy_clay', nameAr: 'طينية ثقيلة', nameEn: 'Dense Clay' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSoilType(s.id)}
                    className={`p-3.5 rounded-2xl text-center transition-all active:scale-95 ${
                      soilType === s.id
                        ? 'bg-blue-600 text-white font-bold shadow-md'
                        : 'bg-white dark:bg-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-800 shadow-sm border border-black/5 dark:border-white/5 text-xs font-semibold'
                    }`}
                  >
                    <span className="text-xs">{lang === 'ar' ? s.nameAr : s.nameEn}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUESTION 3: Subsoil Symptoms */}
      {currentStep === 3 && (
        <div className="space-y-4 animate-fadeIn">
          <h4 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
            {lang === 'ar' ? 'هل تلاحظ أياً من هذه المشاكل في باطن أو سطح التربة؟' : 'Have you observed any soil issues?'}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'none', icon: '✅', nameAr: 'أرض ممتازة ونفاذية طبيعية', nameEn: 'Healthy Permeability', descAr: 'لا يوجد انضغاط أو تمليح، الجذور ممتدة بحرية', descEn: 'No subsoil compaction or salinity' },
              { id: 'hardpan', icon: '🚧', nameAr: 'كتمة وانضغاط في باطن الأرض', nameEn: 'Subsoil Hardpan', descAr: 'طبقة صماء تعيق الجذور عند عمق 40-50 سم', descEn: 'Dense layer blocks roots at 45cm' },
              { id: 'waterlog', icon: '💦', nameAr: 'تطبيل مياه وبطء تصريف', nameEn: 'Slow Drainage', descAr: 'المياه تقف فترات طويلة بعد الري', descEn: 'Water sits on surface for days' },
              { id: 'salinity', icon: '🧂', nameAr: 'ظهور قشور وتمليح', nameEn: 'Soil Salinity', descAr: 'أملاح بيضاء ظاهرة على سطح الأرض', descEn: 'White salt crust accumulation' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setSubsoilIssue(item.id)}
                className={`p-4 rounded-2xl text-start flex items-center justify-between gap-3 transition-all active:scale-[0.98] ${
                  subsoilIssue === item.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white dark:bg-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-800 shadow-sm border border-black/5 dark:border-white/5'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <span className="text-sm font-bold block">{lang === 'ar' ? item.nameAr : item.nameEn}</span>
                    <span className={`text-xs block mt-0.5 ${subsoilIssue === item.id ? 'text-blue-100' : 'text-neutral-400'}`}>
                      {lang === 'ar' ? item.descAr : item.descEn}
                    </span>
                  </div>
                </div>
                {subsoilIssue === item.id && <span className="text-white font-bold text-base">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* QUESTION 4: Primary Strategic Objective */}
      {currentStep === 4 && (
        <div className="space-y-4 animate-fadeIn">
          <h4 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
            {lang === 'ar' ? 'ما هي أولويتك الأهم في الدورة الزراعية؟' : 'What is your primary farming objective?'}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'water', icon: '💧', nameAr: 'توفير أقصى قدر من مياه الري', nameEn: 'Water Conservation', descAr: 'ترشيد استهلاك المياه وتقليل التكاليف', descEn: 'Cut seasonal irrigation demand' },
              { id: 'profit', icon: '💰', nameAr: 'أعلى عائد مالي وربحية نقدية', nameEn: 'Maximum Profit Margin', descAr: 'محاصيل ذات تسويق نقدي سريع وأسعار مجزية', descEn: 'High cash yield crops' },
              { id: 'soil', icon: '🌱', nameAr: 'تجديد خصوبة التربة والنيتروجين', nameEn: 'Soil Fertility & Health', descAr: 'إعادة بناء حيوية الأرض وإراحة التربة', descEn: 'Replenish organic soil nutrients' },
              { id: 'resilience', icon: '🛡️', nameAr: 'مقاومة موجات الحر والجفاف', nameEn: 'Heatwave Resilience', descAr: 'محاصيل تتحمل تقلبات الطقس والحرارة', descEn: 'Tolerate heat & variable weather' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPrimaryPriority(p.id as any)}
                className={`p-4 rounded-2xl text-start flex items-center justify-between gap-3 transition-all active:scale-[0.98] ${
                  primaryPriority === p.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white dark:bg-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-800 shadow-sm border border-black/5 dark:border-white/5'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-2xl">{p.icon}</span>
                  <div>
                    <span className="text-sm font-bold block">{lang === 'ar' ? p.nameAr : p.nameEn}</span>
                    <span className={`text-xs block mt-0.5 ${primaryPriority === p.id ? 'text-blue-100' : 'text-neutral-400'}`}>
                      {lang === 'ar' ? p.descAr : p.descEn}
                    </span>
                  </div>
                </div>
                {primaryPriority === p.id && <span className="text-white font-bold text-base">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* QUESTION 5: Area & Market Target */}
      {currentStep === 5 && (
        <div className="space-y-5 animate-fadeIn">
          <h4 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
            {lang === 'ar' ? 'مساحة الأرض والوجهة التسويقية' : 'Field Area & Market Destination'}
          </h4>

          <div className="space-y-4">
            <div className="bg-white dark:bg-neutral-800/80 p-4 rounded-2xl shadow-sm border border-black/5 dark:border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
                  {lang === 'ar' ? 'مساحة الحقل الإجمالية:' : 'Total Field Area:'}
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                  {areaFeddan} {lang === 'ar' ? 'فدان' : 'feddans'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="150"
                step="1"
                value={areaFeddan}
                onChange={(e) => setAreaFeddan(parseInt(e.target.value))}
                className="w-full accent-blue-600 h-2 cursor-pointer"
              />
            </div>

            <div>
              <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-2">
                {lang === 'ar' ? 'الوجهة التسويقية للإنتاج:' : 'Market Destination:'}
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMarketTarget('local')}
                  className={`p-3.5 rounded-2xl text-center transition-all ${
                    marketTarget === 'local'
                      ? 'bg-blue-600 text-white font-bold shadow-md'
                      : 'bg-white dark:bg-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-800 shadow-sm border border-black/5 dark:border-white/5 text-xs font-semibold'
                  }`}
                >
                  <span className="text-xl block mb-1">🏠</span>
                  <span className="text-xs font-bold">{lang === 'ar' ? 'سوق محلي وتجارة داخلية' : 'Local Market'}</span>
                </button>

                <button
                  onClick={() => setMarketTarget('export')}
                  className={`p-3.5 rounded-2xl text-center transition-all ${
                    marketTarget === 'export'
                      ? 'bg-blue-600 text-white font-bold shadow-md'
                      : 'bg-white dark:bg-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-800 shadow-sm border border-black/5 dark:border-white/5 text-xs font-semibold'
                  }`}
                >
                  <span className="text-xl block mb-1">🚢</span>
                  <span className="text-xs font-bold">{lang === 'ar' ? 'تصدير وقيمة نقدية مضافة' : 'Export Market'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        {currentStep > 1 ? (
          <button
            onClick={() => setCurrentStep(currentStep - 1)}
            className="px-4 py-2.5 rounded-2xl bg-neutral-200/80 dark:bg-neutral-800 hover:bg-neutral-300 text-xs font-bold text-neutral-700 dark:text-neutral-200 transition-all active:scale-95"
          >
            {lang === 'ar' ? 'السابق' : 'Back'}
          </button>
        ) : (
          <div />
        )}

        {currentStep < TOTAL_STEPS ? (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all"
          >
            <span>{lang === 'ar' ? 'التالي ➔' : 'Next ➔'}</span>
          </button>
        ) : (
          <button
            onClick={handleFinish}
            className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all"
          >
            <span>{lang === 'ar' ? 'حفظ وتأكيد الدورة الزراعية ✨' : 'Save & Build Rotation ✨'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
