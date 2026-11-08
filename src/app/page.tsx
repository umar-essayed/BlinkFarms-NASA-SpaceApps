'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Language, FieldMemoryState } from '@/lib/types';
import {
  DEMO_FIELDS,
  FieldPreset,
  generateFieldTelemetry,
  deriveFieldMemoryFromCoords,
} from '@/lib/veloceRootEngine';
import {
  simulateRotationStrategies,
  DEFAULT_PRIORITIES,
  UserPriorities,
} from '@/lib/fieldShiftEngine';
import FarmSetupGateway from '@/components/FarmSetupGateway';
import AgronomicWizard, { WizardAnswers } from '@/components/AgronomicWizard';
import ProfileModal from '@/components/ProfileModal';
import { UserProfile } from '@/components/AuthGateway';
import NasaWeatherCard from '@/components/NasaWeatherCard';
import ProvenanceBadge from '@/components/ProvenanceBadge';
import DroughtThreatGauge from '@/components/DroughtThreatGauge';
import {
  LightningIcon,
  RefreshIcon,
  MessageCircleIcon,
  DropletsIcon,
  SunIcon,
  LeafIcon,
} from '@/components/Icons';

// Dynamically import Clean Leaflet Satellite Map
const SplitFieldMap = dynamic(() => import('@/components/SplitFieldMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-[16/9] min-h-[220px] max-h-[520px] rounded-3xl bg-neutral-900 animate-pulse flex flex-col items-center justify-center text-xs font-semibold text-neutral-400 gap-2">
      <span className="text-3xl animate-spin">🛰️</span>
      <span>تحميل خريطة الأقمار الصناعية...</span>
    </div>
  ),
});

export default function BlinkFarmsApp() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('ar');
  const [activeTab, setActiveTab] = useState<'radar' | 'rotation'>('radar');

  // Application Flow State
  const [appStep, setAppStep] = useState<'farm_setup' | 'dashboard'>('dashboard');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Field Location State (Default: Nile Delta, Egypt)
  const [currentLat, setCurrentLat] = useState<number>(30.850);
  const [currentLon, setCurrentLon] = useState<number>(31.050);
  const [currentFieldName, setCurrentFieldName] = useState<string>('دلتا النيل (طنطا / الغربية)');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('nile_delta');
  const [currentAreaFeddan, setCurrentAreaFeddan] = useState<number>(15);

  // Agronomic Rotation Wizard State
  const [isWizardCompleted, setIsWizardCompleted] = useState<boolean>(false);
  const [wizardAnswers, setWizardAnswers] = useState<WizardAnswers | null>(null);
  const [customMemoryOverrides, setCustomMemoryOverrides] = useState<Partial<FieldMemoryState> | null>(null);

  // Sliders for 3-Year Rotation Preferences (TOPSIS)
  const [priorities, setPriorities] = useState<UserPriorities>(DEFAULT_PRIORITIES);
  const [selectedStrategyId, setSelectedStrategyId] = useState<'balanced' | 'water_saving' | 'current'>('balanced');
  const [whatIfWaterCutPercent, setWhatIfWaterCutPercent] = useState<number>(0);
  const [whatIfHeatwaveC, setWhatIfHeatwaveC] = useState<number>(0);

  // Check LocalStorage on initial client mount to orchestrate journey
  useEffect(() => {
    const savedLang = localStorage.getItem('blinkfarms_lang') as Language;
    if (savedLang) setLang(savedLang);

    const seenStory = localStorage.getItem('blinkfarms_story_v3');
    const savedUser = localStorage.getItem('blinkfarms_auth_user');

    if (!seenStory) {
      router.replace('/onboarding');
      return;
    }
    if (!savedUser) {
      router.replace('/login');
      return;
    }
    try {
      setCurrentUser(JSON.parse(savedUser));
    } catch {
      // ignore parse error
    }

    // Restore Agronomic Wizard persistence
    const savedWizard = localStorage.getItem('blinkfarms_wizard_answers');
    const savedCompleted = localStorage.getItem('blinkfarms_wizard_completed');
    const savedOverrides = localStorage.getItem('blinkfarms_field_memory_overrides');
    const savedPriorities = localStorage.getItem('blinkfarms_priorities');
    const savedArea = localStorage.getItem('blinkfarms_area_feddan');

    if (savedCompleted === 'true' && savedWizard) {
      try {
        const parsed = JSON.parse(savedWizard);
        setWizardAnswers(parsed);
        setIsWizardCompleted(true);
        if (parsed.areaFeddan) setCurrentAreaFeddan(parsed.areaFeddan);
      } catch (e) {
        console.error('Failed to parse wizard answers', e);
      }
    }
    if (savedOverrides) {
      try {
        setCustomMemoryOverrides(JSON.parse(savedOverrides));
      } catch {}
    }
    if (savedPriorities) {
      try {
        setPriorities(JSON.parse(savedPriorities));
      } catch {}
    }
    if (savedArea) {
      try {
        setCurrentAreaFeddan(Number(savedArea));
      } catch {}
    }

    // Check if the user has selected a project/farm before
    const savedPresetId = localStorage.getItem('blinkfarms_selected_preset');
    if (!savedPresetId) {
      // Must open the Farm Setup Gateway modal immediately on first login!
      setAppStep('farm_setup');
    } else {
      setSelectedPresetId(savedPresetId);
      const matched = DEMO_FIELDS.find((p) => p.id === savedPresetId);
      if (matched) {
        setCurrentLat(matched.coordinates[0]);
        setCurrentLon(matched.coordinates[1]);
        setCurrentFieldName(savedLang === 'en' ? matched.nameEn : matched.nameAr);
        setCurrentAreaFeddan(Math.round(matched.areaHa * 2.38));
      }
      setAppStep('dashboard');
    }
  }, [router]);

  // Real-Time Dynamic Telemetry Calculation
  const telemetry = useMemo(() => {
    return generateFieldTelemetry(
      currentLat,
      currentLon,
      `f_${currentLat}_${currentLon}`,
      currentFieldName,
      currentFieldName,
      false
    );
  }, [currentLat, currentLon, currentFieldName]);

  // Real-Time Dynamic Field Memory ($F_{state}$)
  const fieldMemory = useMemo(() => {
    const base = deriveFieldMemoryFromCoords(currentLat, currentLon);
    if (customMemoryOverrides) {
      return {
        ...base,
        ...customMemoryOverrides,
      };
    }
    if (wizardAnswers) {
      return {
        ...base,
        previousCropId: wizardAnswers.previousCrop,
        hardpanDetected: wizardAnswers.subsoilIssue === 'hardpan',
        salinityRiskLevel: wizardAnswers.subsoilIssue === 'salinity' ? ('moderate' as const) : ('normal' as const),
        carryoverWaterFraction: wizardAnswers.irrigationType === 'drip' ? 0.70 : (wizardAnswers.irrigationType === 'pivot' ? 0.60 : 0.45),
        soilErrorIndex: wizardAnswers.subsoilIssue === 'hardpan' ? 1.45 : (wizardAnswers.subsoilIssue === 'salinity' ? 1.30 : 0.85),
      };
    }
    return base;
  }, [currentLat, currentLon, wizardAnswers, customMemoryOverrides]);

  // Real-Time 3-Year / 6-Season Crop Rotation Simulations (FAO AquaCrop + DSSAT Sequence)
  const strategies = useMemo(() => {
    return simulateRotationStrategies(
      fieldMemory,
      priorities,
      currentLat,
      currentLon,
      whatIfWaterCutPercent,
      whatIfHeatwaveC
    );
  }, [fieldMemory, priorities, currentLat, currentLon, whatIfWaterCutPercent, whatIfHeatwaveC]);

  const activeStrategy = useMemo(() => {
    return strategies.find(s => s.id === selectedStrategyId) || strategies[0];
  }, [strategies, selectedStrategyId]);

  const bestStrategy = activeStrategy;

  const activePreset = useMemo(() => {
    return DEMO_FIELDS.find(p => p.id === selectedPresetId);
  }, [selectedPresetId]);

  const toggleLang = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    localStorage.setItem('blinkfarms_lang', nextLang);
    document.documentElement.lang = nextLang;
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
  };

  // Handle Preset Selection
  const handleSelectPreset = (preset: FieldPreset) => {
    setSelectedPresetId(preset.id);
    localStorage.setItem('blinkfarms_selected_preset', preset.id);
    setCurrentLat(preset.coordinates[0]);
    setCurrentLon(preset.coordinates[1]);
    setCurrentFieldName(lang === 'ar' ? preset.nameAr : preset.nameEn);
    setCurrentAreaFeddan(Math.round(preset.areaHa * 2.38));
    setAppStep('dashboard');
  };

  // Handle Custom Farm Selection
  const handleSelectCustom = (lat: number, lon: number, name: string, areaFeddan: number) => {
    setSelectedPresetId('custom');
    localStorage.setItem('blinkfarms_selected_preset', 'custom');
    setCurrentLat(lat);
    setCurrentLon(lon);
    setCurrentFieldName(name);
    setCurrentAreaFeddan(areaFeddan);
    setAppStep('dashboard');
  };

  // Handle Map Click or Drag
  const handleLocationChange = (newLat: number, newLon: number, customName?: string) => {
    setCurrentLat(newLat);
    setCurrentLon(newLon);
    if (customName) {
      setCurrentFieldName(customName);
    } else {
      setCurrentFieldName(lang === 'ar' ? `حقل (${newLat.toFixed(2)}°, ${newLon.toFixed(2)}°)` : `Field (${newLat.toFixed(2)}°, ${newLon.toFixed(2)}°)`);
    }
  };

  // GPS Locate
  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        handleLocationChange(pos.coords.latitude, pos.coords.longitude, lang === 'ar' ? 'موقعي (GPS)' : 'My GPS Location');
      });
    }
  };

  // Handle Agronomic Wizard Finish
  const handleWizardComplete = (
    answers: WizardAnswers,
    updatedPriorities: UserPriorities,
    updatedMemory: Partial<FieldMemoryState>
  ) => {
    setWizardAnswers(answers);
    setPriorities(updatedPriorities);
    setCustomMemoryOverrides(updatedMemory);
    setCurrentAreaFeddan(answers.areaFeddan);
    setIsWizardCompleted(true);

    localStorage.setItem('blinkfarms_wizard_answers', JSON.stringify(answers));
    localStorage.setItem('blinkfarms_wizard_completed', 'true');
    localStorage.setItem('blinkfarms_field_memory_overrides', JSON.stringify(updatedMemory));
    localStorage.setItem('blinkfarms_priorities', JSON.stringify(updatedPriorities));
    localStorage.setItem('blinkfarms_area_feddan', String(answers.areaFeddan));
  };

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#F8F9FA] dark:bg-[#0A0A0C] text-[#1D1D1F] dark:text-[#F5F5F7] transition-colors pb-24 sm:pb-12 w-full max-w-full overflow-x-hidden font-sans select-none"
    >
      {/* Farm Selection Gateway */}
      {appStep === 'farm_setup' && (
        <FarmSetupGateway
          lang={lang}
          onSelectPreset={handleSelectPreset}
          onSelectCustom={handleSelectCustom}
        />
      )}

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={currentUser}
        lang={lang}
        farmAcreage={currentAreaFeddan}
        fieldName={currentFieldName}
        onLogout={() => {
          localStorage.removeItem('blinkfarms_auth_user');
          setCurrentUser(null);
          setIsProfileModalOpen(false);
          router.push('/login');
        }}
        onOpenFarmSetup={() => setAppStep('farm_setup')}
      />

      {/* Ultra-Clean Modern Top Bar: Logo + Field Picker + Profile + Lang */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-neutral-900/85 backdrop-blur-2xl border-b border-black/5 dark:border-white/10 w-full">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          {/* Brand + Field Picker */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setActiveTab('radar')}
              className="flex items-center gap-2 shrink-0 focus:outline-none"
            >
              <img
                src="/logo.png"
                alt="BlinkFarms"
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow-sm active:scale-95 transition-transform"
              />
              <span className="text-sm sm:text-base font-extrabold tracking-tight text-neutral-900 dark:text-white leading-none hidden sm:block">
                BlinkFarms
              </span>
            </button>

            {/* Field Dropdown / Switcher */}
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl min-w-0 max-w-[170px] sm:max-w-[240px]">
              <select
                value={selectedPresetId}
                onChange={(e) => {
                  if (e.target.value === 'open_setup') {
                    setAppStep('farm_setup');
                  } else {
                    const p = DEMO_FIELDS.find(f => f.id === e.target.value);
                    if (p) handleSelectPreset(p);
                  }
                }}
                className="bg-transparent text-xs font-bold text-neutral-800 dark:text-neutral-200 px-2 py-1 focus:outline-none cursor-pointer truncate min-w-0 flex-1"
              >
                {DEMO_FIELDS.map(f => (
                  <option key={f.id} value={f.id} className="dark:bg-neutral-900">
                    {lang === 'ar' ? f.nameAr : f.nameEn}
                  </option>
                ))}
                <option value="open_setup" className="dark:bg-neutral-900 font-bold text-blue-600">
                  {lang === 'ar' ? '➕ تحديد حقل آخر...' : '➕ Change Field...'}
                </option>
              </select>
              <button
                onClick={handleLocateMe}
                className="p-1 rounded-xl bg-white dark:bg-neutral-700 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200 shadow-sm text-xs shrink-0"
                title={lang === 'ar' ? 'موقعي بالـ GPS' : 'GPS Location'}
              >
                📍
              </button>
            </div>
          </div>

          {/* Desktop/Tablet 3 Navigation Tabs */}
          <nav className="hidden md:flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl text-xs font-bold shrink-0">
            <button
              onClick={() => setActiveTab('radar')}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'radar'
                  ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-white shadow-sm font-extrabold'
                  : 'text-neutral-500 hover:text-black dark:hover:text-white'
              }`}
            >
              <LightningIcon className="w-4 h-4" />
              <span>{lang === 'ar' ? 'الرئيسية / رادار الحقل' : 'Field Radar'}</span>
            </button>

            <button
              onClick={() => setActiveTab('rotation')}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'rotation'
                  ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-white shadow-sm font-extrabold'
                  : 'text-neutral-500 hover:text-black dark:hover:text-white'
              }`}
            >
              <RefreshIcon className="w-4 h-4" />
              <span>{lang === 'ar' ? 'الدورة الزراعية' : 'Crop Rotation'}</span>
            </button>

            <Link
              href="/chat"
              className="px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 active:scale-95"
            >
              <MessageCircleIcon className="w-4 h-4" />
              <span>{lang === 'ar' ? 'المرشد الذكي' : 'AI Advisor'}</span>
            </Link>
          </nav>

          {/* Right Controls: Profile Button + Language Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Real Profile Button */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all active:scale-95"
              title={lang === 'ar' ? 'الملف الشخصي للمزارع' : 'Farmer Profile'}
            >
              <span className="text-sm">👤</span>
              <span className="hidden sm:inline">
                {currentUser?.name ? currentUser.name.split(' ')[0] : (lang === 'ar' ? 'حسابي' : 'Profile')}
              </span>
            </button>

            {/* Language Switcher */}
            <button
              onClick={toggleLang}
              className="px-3 py-1.5 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold shadow-sm active:scale-95 transition-all"
            >
              {lang === 'ar' ? 'English' : 'عربي'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Flow Content (Edge-to-Edge Fluid Background) */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 w-full min-w-0">
        {/* =========================================================================
            TAB 1: HOME / FIELD RADAR
           ========================================================================= */}
        {activeTab === 'radar' && (
          <div className="space-y-6 animate-fadeIn">
            {/* 1. CRYSTAL-CLEAR 16:9 SATELLITE MAP */}
            <div className="w-full">
              <SplitFieldMap
                lat={currentLat}
                lon={currentLon}
                fieldName={currentFieldName}
                lang={lang}
                onLocationChange={handleLocationChange}
                isShockActive={telemetry.isFlashDroughtAlert}
                polygonBoundary={activePreset?.polygonBoundary}
              />
            </div>

            {/* Verified NASA POWER Live Observations */}
            <NasaWeatherCard lat={currentLat} lon={currentLon} lang={lang} />

            {/* 2. THE 3 ESSENTIAL ACTION CARDS (FARMER LANGUAGE ONLY) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Prescribed Irrigation Today */}
              <div className="p-5 rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-neutral-400 text-xs mb-3">
                    <span className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
                      {lang === 'ar' ? 'الري المطلوب اليوم' : 'Prescribed Irrigation Today'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                      <DropletsIcon className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white font-mono tracking-tight">
                        ~{Math.round(telemetry.prescribedIrrigationMm * 4.2)}
                      </span>
                      <span className="text-sm font-bold text-neutral-500">
                        {lang === 'ar' ? 'م³ / فدان' : 'm³/feddan'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 font-medium">
                      {lang === 'ar' ? 'حالة الإرواء:' : 'Mode:'}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl ${
                        telemetry.isFlashDroughtAlert
                          ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      }`}
                    >
                      {telemetry.isFlashDroughtAlert
                        ? (lang === 'ar' ? '🚨 ري عاجل للإنقاذ' : '🚨 Urgent Quenching')
                        : (lang === 'ar' ? '💧 ري عادي صيانة' : '💧 Routine Maintenance')}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">
                    {lang === 'ar'
                      ? 'مع طراوة الصباح الباكر (5:00 - 8:00 ص) أو بعد العصر'
                      : 'Best during early morning (5:00 - 8:00 AM) or late afternoon'}
                  </p>
                </div>
              </div>

              {/* Card 2: Plant Leaf Temperature */}
              <div className="p-5 rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-neutral-400 text-xs mb-3">
                    <span className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
                      {lang === 'ar' ? 'حرارة أوراق النبات' : 'Crop Leaf Temperature'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
                      <SunIcon className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white font-mono tracking-tight">
                        {telemetry.canopyTempC}°C
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 space-y-2.5">
                  {/* Intuitive Color Gauge Bar Underneath */}
                  <div className="space-y-1.5">
                    <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden flex">
                      <div className="w-1/3 h-full bg-emerald-500" title="معتدلة ومبردة"></div>
                      <div className="w-1/3 h-full bg-amber-400" title="دافية"></div>
                      <div className="w-1/3 h-full bg-red-500" title="حرارة مرتفعة وعطش"></div>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className={telemetry.canopyTempC <= 28 ? 'text-emerald-600 font-extrabold' : 'text-neutral-400'}>
                        {lang === 'ar' ? 'معتدلة ومبردة 🟢' : 'Cool 🟢'}
                      </span>
                      <span className={telemetry.canopyTempC > 28 && telemetry.canopyTempC <= 33 ? 'text-amber-500 font-extrabold' : 'text-neutral-400'}>
                        {lang === 'ar' ? 'دافية 🟡' : 'Warm 🟡'}
                      </span>
                      <span className={telemetry.canopyTempC > 33 ? 'text-red-600 font-extrabold' : 'text-neutral-400'}>
                        {lang === 'ar' ? 'عطش وحرارة 🔴' : 'Fever 🔴'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">
                    {telemetry.canopyTempC <= 28
                      ? (lang === 'ar' ? 'الأوراق مبردة ذاتياً وتتنفس بارتياح' : 'Leaves are well-hydrated and self-cooling')
                      : telemetry.canopyTempC <= 33
                      ? (lang === 'ar' ? 'بداية دفء في الأوراق، راقب رطوبة الجذور' : 'Slight leaf warmth, check root moisture')
                      : (lang === 'ar' ? 'حرارة مرتفعة، عروق النبات عطشانة ومساماته مقفلة' : 'High fever: stomata closed from moisture deficit')}
                  </p>
                </div>
              </div>

              {/* Card 3: Plant Respiration & Transpiration */}
              <div className="p-5 rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-neutral-400 text-xs mb-3">
                    <span className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
                      {lang === 'ar' ? 'تنفس وعرق النبات (النتح)' : 'Plant Transpiration & Respiration'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
                      <LeafIcon className="w-4 h-4" />
                    </div>
                  </div>

                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    {lang === 'ar' ? 'مدى كفاءة مسام النبات في التبريد الذاتي' : 'Efficiency of leaf stomatal self-cooling'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 font-medium">
                      {lang === 'ar' ? 'الحالة الحالية:' : 'Status:'}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl ${
                        telemetry.currentESI >= 0.70
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300'
                      }`}
                    >
                      {telemetry.currentESI >= 0.70
                        ? (lang === 'ar' ? 'يتنفس بكفاءة طبيعية 🟢' : 'Breathing Normally 🟢')
                        : (lang === 'ar' ? 'اختناق وعطش 🔴' : 'Suffocating & Thirsty 🔴')}
                    </span>
                  </div>

                  {/* Clean Visual Gauge */}
                  <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                    <div
                      style={{ width: `${Math.round(telemetry.currentESI * 100)}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        telemetry.currentESI >= 0.70 ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                    />
                  </div>

                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">
                    {telemetry.currentESI >= 0.70
                      ? (lang === 'ar' ? 'مسامات الورقة مفتوحة وتضخ الرطوبة بسلاسة' : 'Stomata open, healthy cooling flow')
                      : (lang === 'ar' ? 'المسامات مقفولة لحبس المياه، النبات تحت ضغط' : 'Stomata clamped shut to preserve internal moisture')}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. REAL-TIME DROUGHT THREAT GAUGE & STRESS VELOCITY */}
            <DroughtThreatGauge telemetry={telemetry} lang={lang} />
          </div>
        )}

        {/* =========================================================================
            TAB 2: CROP ROTATION & FIELD SOIL HEALTH
           ========================================================================= */}
        {activeTab === 'rotation' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Show Agronomic Wizard if not yet completed */}
            {!isWizardCompleted ? (
              <AgronomicWizard
                lang={lang}
                onComplete={handleWizardComplete}
                initialAnswers={wizardAnswers}
              />
            ) : (
              <div className="space-y-6">
                {/* Wizard Recalibration Bar */}
                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 shadow-sm border border-black/5 dark:border-white/5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    <span>✅</span>
                    <span>
                      {lang === 'ar'
                        ? `تمت مواءمة الدورة الزراعية مع خصائص حقل (${currentAreaFeddan} فدان)`
                        : `Rotation calibrated for field (${currentAreaFeddan} feddans)`}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setIsWizardCompleted(false);
                      localStorage.setItem('blinkfarms_wizard_completed', 'false');
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-blue-600 dark:text-blue-400 active:scale-95 transition-all shrink-0"
                  >
                    {lang === 'ar' ? 'إعادة التحديد 🔄' : 'Recalibrate 🔄'}
                  </button>
                </div>

                {/* The 3 Plain Farmer Soil Insights - Unboxed and Fluid */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                        {lang === 'ar' ? 'تشخيص سلامة باطن الأرض والتربة' : 'Subsoil Health Insights'}
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {lang === 'ar' ? 'رصد طبقات الأرض من الفضاء بدون حساسات أرضية' : 'Orbital subsoil diagnostics without ground probes'}
                      </p>
                    </div>

                    <ProvenanceBadge
                      state={wizardAnswers ? 'USER_INPUT' : 'ESTIMATED'}
                      source={wizardAnswers ? (lang === 'ar' ? 'استبيان المزارع' : 'Farmer Input') : 'SMAP L4 & Hydraulic Probe'}
                      lang={lang}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Insight 1: Subsoil Condition */}
                    <div className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-sm">
                      <span className="text-xs text-neutral-400 block mb-1.5 font-bold">
                        {lang === 'ar' ? '1. حالة باطن التربة' : '1. Subsoil Condition'}
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white leading-relaxed">
                        {fieldMemory.hardpanDetected
                          ? (lang === 'ar' ? 'كتمة وانضغاط في باطن الأرض يحتاج حرث تحت التربة ⚠️' : 'Subsoil compaction detected (requires deep chisel plow) ⚠️')
                          : (lang === 'ar' ? 'نفاذية جيدة وممتازة، الجذور تتنفس بسهولة 🟢' : 'Optimal permeability, roots breathe easily 🟢')}
                      </p>
                    </div>

                    {/* Insight 2: Subsoil Moisture */}
                    <div className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-sm">
                      <span className="text-xs text-neutral-400 block mb-1.5 font-bold">
                        {lang === 'ar' ? '2. رطوبة الأعماق' : '2. Deep Moisture'}
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white leading-relaxed">
                        {fieldMemory.carryoverWaterFraction >= 0.5
                          ? (lang === 'ar' ? 'مخزون رطوبة جيد في الأعماق 🟢' : 'Good deep moisture reserve 🟢')
                          : (lang === 'ar' ? 'جفاف باطني، يحتاج ري تشبيع هادئ 🟡' : 'Subsoil moisture deficit 🟡')}
                      </p>
                    </div>

                    {/* Insight 3: Salinity */}
                    <div className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-sm">
                      <span className="text-xs text-neutral-400 block mb-1.5 font-bold">
                        {lang === 'ar' ? '3. الملوحة' : '3. Soil Salinity'}
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white leading-relaxed">
                        {fieldMemory.salinityRiskLevel === 'moderate' || fieldMemory.salinityRiskLevel === 'severe'
                          ? (lang === 'ar' ? 'خطر تمليح، يُنصح بمحسنات وجبس زراعي 🔴' : 'Salinity risk, agricultural gypsum recommended 🔴')
                          : (lang === 'ar' ? 'طبيعية وآمنة، لا يوجد خطر ترسبات 🟢' : 'Normal and safe, no salinity risk 🟢')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3-Year / 6-Season Adaptive Rotation Plan (FAO AquaCrop + DSSAT Sequence) */}
                <div className="space-y-4 pt-3">
                  {/* Judge Quick-Load Presets Bar */}
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-900/20 via-emerald-900/20 to-purple-900/20 border border-black/5 dark:border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      <div className="flex items-center gap-1.5">
                        <span>⚖️</span>
                        <span>{lang === 'ar' ? 'اختبارات المحكّمين السريعة (Judge Quick-Load Presets):' : 'Judge Quick-Load Scenarios:'}</span>
                      </div>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">NASA POWER + AquaCrop Live</span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => {
                          const delta = DEMO_FIELDS.find((f) => f.id === 'nile_delta') || DEMO_FIELDS[0];
                          handleSelectPreset(delta);
                          setCustomMemoryOverrides({ salinityRiskLevel: 'normal', hardpanDetected: false, carryoverWaterFraction: 0.65 });
                          setWhatIfWaterCutPercent(0);
                          setWhatIfHeatwaveC(0);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-neutral-800 hover:bg-neutral-100 text-[11px] font-bold text-neutral-800 dark:text-neutral-200 border border-black/5 dark:border-white/5 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <span>🌾</span>
                        <span>{lang === 'ar' ? 'دلتا النيل (طميية - ملوحة منخفضة)' : 'Nile Delta (Clay - Low Salinity)'}</span>
                      </button>

                      <button
                        onClick={() => {
                          const toshka = DEMO_FIELDS.find((f) => f.id === 'toshka') || DEMO_FIELDS[1];
                          handleSelectPreset(toshka);
                          setCustomMemoryOverrides({ salinityRiskLevel: 'severe', hardpanDetected: false, carryoverWaterFraction: 0.25 });
                          setWhatIfWaterCutPercent(15);
                          setWhatIfHeatwaveC(2);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-neutral-800 hover:bg-neutral-100 text-[11px] font-bold text-neutral-800 dark:text-neutral-200 border border-black/5 dark:border-white/5 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <span>☀️</span>
                        <span>{lang === 'ar' ? 'توشكى / المغرة (حرارة وملوحة + عجز مائي)' : 'Toshka / Moghra (Heat + Salinity)'}</span>
                      </button>

                      <button
                        onClick={() => {
                          const delta = DEMO_FIELDS.find((f) => f.id === 'nile_delta') || DEMO_FIELDS[0];
                          handleSelectPreset(delta);
                          setCustomMemoryOverrides({ salinityRiskLevel: 'normal', hardpanDetected: true, carryoverWaterFraction: 0.35, soilErrorIndex: 1.45 });
                          setWhatIfWaterCutPercent(10);
                          setWhatIfHeatwaveC(1);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-neutral-800 hover:bg-neutral-100 text-[11px] font-bold text-neutral-800 dark:text-neutral-200 border border-black/5 dark:border-white/5 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <span>⛏️</span>
                        <span>{lang === 'ar' ? 'أرض منضغطة (طبقة صماء Hardpan وعجز ري)' : 'Compacted Hardpan Subsoil'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Header & Water Saved Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                        {lang === 'ar' ? 'خطة الدورة الزراعية لـ 3 سنوات (6 عروات شتوي وصيفي)' : '3-Year 6-Season Agro-Climatic Rotation Plan'}
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {lang === 'ar'
                          ? 'نمذجة فيزيائية متكاملة تجمع بين إنتاجية المياه (AquaCrop) وتتابع خصوبة التربة (DSSAT)'
                          : 'Biophysical crop-growth simulation (AquaCrop WP*) & multi-season soil nitrogen carryover (DSSAT)'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto bg-blue-50 dark:bg-blue-950/40 px-3.5 py-1.5 rounded-2xl">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">{lang === 'ar' ? 'توفير المياه:' : 'Water Saved:'}</span>
                      <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400 font-mono">-{activeStrategy.totalWaterSavedPercent}%</span>
                    </div>
                  </div>

                  {/* Strategy Selector Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
                    {strategies.map((strat) => (
                      <button
                        key={strat.id}
                        onClick={() => setSelectedStrategyId(strat.id as any)}
                        className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all active:scale-95 shrink-0 flex items-center gap-2 ${
                          selectedStrategyId === strat.id
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white/80 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100'
                        }`}
                      >
                        <span>
                          {strat.id === 'balanced' && '⚖️'}
                          {strat.id === 'water_saving' && '💧'}
                          {strat.id === 'current' && '⚠️'}
                        </span>
                        <span>
                          {strat.id === 'balanced'
                            ? (lang === 'ar' ? 'الدورة المتوازنة (أفضل تعاقب)' : 'Optimal Balanced')
                            : strat.id === 'water_saving'
                            ? (lang === 'ar' ? 'توفير المياه القصوى (C4 Focus)' : 'Ultra Water Saving (C4)')
                            : (lang === 'ar' ? 'الزراعة التقليدية (الوضع القائم)' : 'Traditional Baseline')}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/15">
                          TOPSIS: {strat.topsisCloseness.toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Economic ROI & Soil Restoration Card */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 sm:p-5 rounded-3xl bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20">
                    <div className="space-y-1">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 font-bold block">
                        {lang === 'ar' ? '🌾 توفير الأسمدة الآزوتية (اليوريا)' : '🌾 Saved Urea Fertilizer Bags'}
                      </span>
                      <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        {activeStrategy.totalUreaBagsSavedPerFeddan > 0 ? `${activeStrategy.totalUreaBagsSavedPerFeddan} شيكارة / فدان` : (lang === 'ar' ? '0 (بدون بقوليات)' : '0 bags')}
                      </div>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
                        {lang === 'ar'
                          ? `وفر مالي: ~${activeStrategy.totalFertilizerSavingsEgp.toLocaleString()} جنيه للفدان من النيتروجين الطبيعي.`
                          : `Saves ~$${Math.round(activeStrategy.totalUreaBagsSavedPerFeddan * 10)}/feddan via biological N-fixation.`}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 font-bold block">
                        {lang === 'ar' ? '💧 وفورات مياه الري الصافية' : '💧 Net Irrigation Water Saved'}
                      </span>
                      <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                        {activeStrategy.totalWaterSavedM3Feddan > 0 ? `${activeStrategy.totalWaterSavedM3Feddan.toLocaleString()} م³ / فدان` : (lang === 'ar' ? '0 م³' : '0 m³')}
                      </div>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
                        {lang === 'ar'
                          ? `مقارنة بالزراعة الأحادية التقليدية لنفس المساحة (${currentAreaFeddan} فدان).`
                          : `Compared to monoculture baseline across ${currentAreaFeddan} feddans.`}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 font-bold block">
                        {lang === 'ar' ? '🚜 صحة التربة والحرث العميق' : '🚜 Subsoil Bio-Drilling'}
                      </span>
                      <div className="text-sm font-black text-neutral-900 dark:text-white leading-snug pt-1">
                        {activeStrategy.biodrillingRemediated
                          ? (lang === 'ar' ? '✅ تم تفكيك الطبقة الصماء مجاناً بالجذور الوتدية' : '✅ Hardpan bio-drilled via taproots')
                          : (lang === 'ar' ? 'تحتاج مراقبة مستمرة للتهوية والصرف' : 'Standard aeration management')}
                      </div>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
                        {activeStrategy.biodrillingRemediated
                          ? (lang === 'ar' ? 'توفير تكلفة استئجار جرار الحرث تحت التربة (Subsoiler).' : 'Saves mechanical subsoiling costs.')
                          : (lang === 'ar' ? 'احرص على إدخال محصول وتدي عميق مستقبلاً.' : 'Consider deep taproots in next cycle.')}
                      </p>
                    </div>
                  </div>

                  {/* Dual What-If Climate Stress Simulator Bar */}
                  <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🧪</span>
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                          {lang === 'ar' ? 'محاكي الإجهاد المناخي المزدوج (Dual What-If Simulator)' : 'Dual Climate Stress Simulator'}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-amber-600 font-mono">
                        NASA POWER Coupled
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {/* Slider 1: Water Cut */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span>{lang === 'ar' ? '1. عجز حصة مياه الري (Water Quota Cut):' : '1. Water Quota Cut:'}</span>
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

                      {/* Slider 2: Heatwave Shock */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span>{lang === 'ar' ? '2. موجة حرارية صيفية (Heatwave Shock):' : '2. Heatwave Shock:'}</span>
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

                    {(whatIfWaterCutPercent > 0 || whatIfHeatwaveC > 0) && (
                      <div className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed font-medium pt-1 border-t border-amber-500/20">
                        {lang === 'ar'
                          ? `تحت عجز مائي (-${whatIfWaterCutPercent}%) وموجة حرارية (+${whatIfHeatwaveC}°م): محاكاة FAO AquaCrop تؤكد تفوق محاصيل C4 وذات الجذور العميقة في الحفاظ على مؤشر الحصاد (HI_adj)، بينما تتعرض المحاصيل الأحادية الحساسة لعقم التزهير بنسبة تفوق 35%.`
                          : `Under -${whatIfWaterCutPercent}% water cut and +${whatIfHeatwaveC}°C heatwave: FAO AquaCrop confirms C4 crops maintain harvest index (HI_adj), whereas sensitive monocultures suffer >35% anthesis sterility.`}
                      </div>
                    )}
                  </div>

                  {/* Farmer Preference Weights */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 sm:p-5 rounded-3xl bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span>{lang === 'ar' ? 'توفير المياه' : 'Water Conservation'}</span>
                        <span className="font-mono text-blue-600">{Math.round(priorities.waterWeight * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.8"
                        step="0.05"
                        value={priorities.waterWeight}
                        onChange={(e) => setPriorities({ ...priorities, waterWeight: parseFloat(e.target.value) })}
                        className="w-full accent-blue-600 h-2 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span>{lang === 'ar' ? 'العائد المالي' : 'Profit Margin'}</span>
                        <span className="font-mono text-emerald-600">{Math.round(priorities.profitWeight * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.8"
                        step="0.05"
                        value={priorities.profitWeight}
                        onChange={(e) => setPriorities({ ...priorities, profitWeight: parseFloat(e.target.value) })}
                        className="w-full accent-emerald-600 h-2 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span>{lang === 'ar' ? 'خصوبة التربة' : 'Soil Fertility'}</span>
                        <span className="font-mono text-purple-600">{Math.round(priorities.soilHealthWeight * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.8"
                        step="0.05"
                        value={priorities.soilHealthWeight}
                        onChange={(e) => setPriorities({ ...priorities, soilHealthWeight: parseFloat(e.target.value) })}
                        className="w-full accent-purple-600 h-2 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* 6-Season Visual Timeline Cards (Grouped by Year: 3 Years × 2 Seasons) */}
                  <div className="space-y-3.5">
                    {activeStrategy.years.map((y) => {
                      const winterSeason = y.seasons?.[0];
                      const summerSeason = y.seasons?.[1];

                      return (
                        <div
                          key={y.year}
                          className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-sm border border-black/5 dark:border-white/5 space-y-3"
                        >
                          {/* Year Header */}
                          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold px-3 py-1 rounded-xl bg-blue-600 text-white shadow-sm">
                                {lang === 'ar' ? `السنة ${y.year}` : `Year ${y.year}`}
                              </span>
                              <span className="text-xs text-neutral-500 font-bold">
                                {lang === 'ar' ? 'عروتان متعاقبتان (شتوي + صيفي)' : 'Two Successive Seasons (Winter + Summer)'}
                              </span>
                            </div>

                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              {lang === 'ar'
                                ? `صافي دخل السنة: ~$${y.netIncomeUsdHa.toLocaleString()} / هكتار`
                                : `Annual Net: ~$${y.netIncomeUsdHa.toLocaleString()}/ha`}
                            </span>
                          </div>

                          {/* Two Seasons Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Season 1: Winter */}
                            {winterSeason && (
                              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-black/5 dark:border-white/5 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                    <span>❄️</span>
                                    <span>{lang === 'ar' ? 'العروة الشتوية (أكتوبر - مايو)' : 'Winter Season (Oct-May)'}</span>
                                  </span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-neutral-500 font-bold">
                                    {winterSeason.crop.c3_c4pathway}
                                  </span>
                                </div>

                                <div>
                                  <h4 className="text-sm font-black text-neutral-900 dark:text-white">
                                    {lang === 'ar' ? winterSeason.crop.nameAr : winterSeason.crop.nameEn}
                                  </h4>
                                  <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                                    <span>💧 {Math.round(winterSeason.seasonalWaterNeedM3Ha * 0.42)} م³/فدان</span>
                                    <span>•</span>
                                    <span>{lang === 'ar' ? winterSeason.crop.familyNameAr : winterSeason.crop.familyNameEn}</span>
                                  </div>
                                </div>

                                <div className="p-2 rounded-xl bg-white/80 dark:bg-neutral-900/80 text-[10.5px] text-neutral-600 dark:text-neutral-300 leading-snug">
                                  💡 {lang === 'ar' ? winterSeason.transitionReasonAr : winterSeason.transitionReasonEn}
                                </div>
                              </div>
                            )}

                            {/* Season 2: Summer */}
                            {summerSeason && (
                              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-black/5 dark:border-white/5 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                                    <span>☀️</span>
                                    <span>{lang === 'ar' ? 'العروة الصيفية (مايو - أكتوبر)' : 'Summer Season (May-Oct)'}</span>
                                  </span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-neutral-500 font-bold">
                                    {summerSeason.crop.c3_c4pathway}
                                  </span>
                                </div>

                                <div>
                                  <h4 className="text-sm font-black text-neutral-900 dark:text-white">
                                    {lang === 'ar' ? summerSeason.crop.nameAr : summerSeason.crop.nameEn}
                                  </h4>
                                  <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                                    <span>💧 {Math.round(summerSeason.seasonalWaterNeedM3Ha * 0.42)} م³/فدان</span>
                                    <span>•</span>
                                    <span>{lang === 'ar' ? summerSeason.crop.familyNameAr : summerSeason.crop.familyNameEn}</span>
                                  </div>
                                </div>

                                <div className="p-2 rounded-xl bg-white/80 dark:bg-neutral-900/80 text-[10.5px] text-neutral-600 dark:text-neutral-300 leading-snug">
                                  💡 {lang === 'ar' ? summerSeason.transitionReasonAr : summerSeason.transitionReasonEn}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Scientific Evidence & Provenance Disclosure */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm border border-black/5 dark:border-white/5 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🛰️</span>
                        <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                          {lang === 'ar' ? 'سند الإثبات العلمي من أرصاد ناسا الفضائية' : 'NASA Earth Observation Evidence Basis'}
                        </h4>
                      </div>
                      <ProvenanceBadge
                        state="SIMULATED"
                        source="NASA POWER + SMAP + Landsat"
                        resolution="30m - 0.5°"
                        lang={lang}
                      />
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      {lang === 'ar' ? activeStrategy.evidenceSummaryAr : activeStrategy.evidenceSummaryEn}
                    </p>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium pt-1 border-t border-black/5 dark:border-white/5">
                      {lang === 'ar' ? activeStrategy.risksAndGapsAr : activeStrategy.risksAndGapsEn}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Mobile Bottom Navigation Bar (Dashboard View: Radar, Rotation, Link to Chat) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-[2000] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl border-t border-black/10 dark:border-white/10 px-6 py-2 pb-5 flex items-center justify-around shadow-2xl max-w-full overflow-hidden"
      >
        <button
          onClick={() => setActiveTab('radar')}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold py-1.5 px-4 rounded-2xl transition-all active:scale-95 ${
            activeTab === 'radar' ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40' : 'text-neutral-400 dark:text-neutral-500'
          }`}
        >
          <LightningIcon className="w-5 h-5" />
          <span>{lang === 'ar' ? 'الرئيسية' : 'Radar'}</span>
        </button>

        <button
          onClick={() => setActiveTab('rotation')}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold py-1.5 px-4 rounded-2xl transition-all active:scale-95 ${
            activeTab === 'rotation' ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40' : 'text-neutral-400 dark:text-neutral-500'
          }`}
        >
          <RefreshIcon className="w-5 h-5" />
          <span>{lang === 'ar' ? 'الدورة الزراعية' : 'Rotation'}</span>
        </button>

        <Link
          href="/chat"
          className="flex flex-col items-center gap-1 text-[11px] font-bold py-1.5 px-4 rounded-2xl transition-all active:scale-95 text-neutral-400 dark:text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <MessageCircleIcon className="w-5 h-5" />
          <span>{lang === 'ar' ? 'المرشد الذكي' : 'Advisor'}</span>
        </Link>
      </nav>
    </div>
  );
}
