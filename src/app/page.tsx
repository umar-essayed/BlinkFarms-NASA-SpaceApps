'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Language, FieldMemoryState, UnifiedFarmVitals } from '@/lib/types';
import { DailyWeatherObservation } from '@/lib/provenanceTypes';
import {
  DEMO_FIELDS,
  FieldPreset,
  generateFieldTelemetry,
  deriveFieldMemoryFromCoords,
  buildUnifiedFarmVitals,
} from '@/lib/veloceRootEngine';
import {
  simulateRotationStrategies,
  DEFAULT_PRIORITIES,
  UserPriorities,
} from '@/lib/fieldShiftEngine';
import FarmSetupGateway from '@/components/FarmSetupGateway';
import AgronomicWizard, { WizardAnswers } from '@/components/AgronomicWizard';
import ProfileModal from '@/components/ProfileModal';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import { UserProfile } from '@/components/AuthGateway';
import NasaWeatherCard from '@/components/NasaWeatherCard';
import ProvenanceBadge from '@/components/ProvenanceBadge';
import DroughtThreatGauge from '@/components/DroughtThreatGauge';
import FarmerMorningVitals from '@/components/FarmerMorningVitals';
import CropRotationPlanner from '@/components/CropRotationPlanner';
import {
  LightningIcon,
  RefreshIcon,
  MessageCircleIcon,
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
    if (savedLang) {
      setLang(savedLang);
      document.documentElement.lang = savedLang;
      document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
    }

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

  // NASA POWER Weather Observation State
  const [weatherObs, setWeatherObs] = useState<DailyWeatherObservation | null>(null);

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

  // Unified Farm Vitals (Single Source of Truth)
  const unifiedVitals = useMemo(() => {
    return buildUnifiedFarmVitals(telemetry, weatherObs, currentAreaFeddan, lang);
  }, [telemetry, weatherObs, currentAreaFeddan, lang]);

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
              className="px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95 font-bold"
            >
              <img src="/blink-ai-logo.png" alt="BlinkAI" className="w-5 h-5 rounded-full object-cover border border-emerald-500/40 shadow-sm" />
              <span>BlinkAI</span>
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

            {/* Daily Field Operations Center (Unified V2 - 4 Authoritative Decisions) */}
            <FarmerMorningVitals
              telemetry={telemetry}
              vitals={unifiedVitals}
              areaFeddan={currentAreaFeddan}
              lang={lang}
            />

            {/* Verified NASA POWER Live Observations & Provenance */}
            <NasaWeatherCard
              lat={currentLat}
              lon={currentLon}
              lang={lang}
              onObsLoaded={setWeatherObs}
              vitals={unifiedVitals}
            />

            {/* Real-Time Flash Drought Early Warning Radar & 14-Day Advantage */}
            <DroughtThreatGauge
              telemetry={telemetry}
              vitals={unifiedVitals}
              lang={lang}
            />
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

                {/* Sleek Subsoil & Soil Health Diagnostic Strip */}
                <div className="p-4 sm:p-5 rounded-3xl bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md shadow-sm border border-black/5 dark:border-white/10 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 dark:border-white/10 pb-2.5">
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                        <span>🌍</span>
                        <span>{lang === 'ar' ? 'تشخيص سلامة باطن الأرض والتربة' : 'Subsoil Health & Compaction Diagnostics'}</span>
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {lang === 'ar' ? 'تحليل راداري لطبقات الأرض (SMAP L4 + مسبار النفاذية الهيدروليكية)' : 'Orbital subsoil diagnostics without ground probes'}
                      </p>
                    </div>

                    <ProvenanceBadge
                      state={wizardAnswers ? 'USER_INPUT' : 'ESTIMATED'}
                      source={wizardAnswers ? (lang === 'ar' ? 'استبيان المزارع' : 'Farmer Input') : 'SMAP L4 & Hydraulic Probe'}
                      lang={lang}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    {/* Diagnostic 1: Hardpan Compaction */}
                    <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#16161C] border border-black/5 dark:border-white/5 space-y-1">
                      <span className="text-[11px] font-bold text-neutral-400 block">
                        {lang === 'ar' ? '1. كتمة باطن التربة (Hardpan)' : '1. Subsoil Hardpan'}
                      </span>
                      <p className="font-bold text-neutral-900 dark:text-white leading-snug">
                        {fieldMemory.hardpanDetected
                          ? (lang === 'ar' ? '⚠️ كتمة متكلسة تحتاج تفكيكاً بالجذور الوتدية (سورجم/برسيم حجازي)' : '⚠️ Caliche compaction detected (deep taproots required)')
                          : (lang === 'ar' ? '🟢 نفاذية ممتازة وانسياب حر للجذور' : '🟢 Optimal permeability, roots breathe easily')}
                      </p>
                    </div>

                    {/* Diagnostic 2: Deep Moisture Reserve */}
                    <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#16161C] border border-black/5 dark:border-white/5 space-y-1">
                      <span className="text-[11px] font-bold text-neutral-400 block">
                        {lang === 'ar' ? '2. مخزون رطوبة الأعماق' : '2. Deep Moisture Reserve'}
                      </span>
                      <p className="font-bold text-neutral-900 dark:text-white leading-snug">
                        {fieldMemory.carryoverWaterFraction >= 0.5
                          ? (lang === 'ar' ? '🟢 مخزون رطوبي وفير في قاع التربة' : '🟢 Adequate deep moisture reserve')
                          : (lang === 'ar' ? '🟡 عجز رطوبي يحتاج ري تشبيعي عميق' : '🟡 Deep moisture deficit')}
                      </p>
                    </div>

                    {/* Diagnostic 3: Salinity Risk (ECe) */}
                    <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#16161C] border border-black/5 dark:border-white/5 space-y-1">
                      <span className="text-[11px] font-bold text-neutral-400 block">
                        {lang === 'ar' ? '3. ملوحة التربة (ECe)' : '3. Soil Salinity Risk'}
                      </span>
                      <p className="font-bold text-neutral-900 dark:text-white leading-snug">
                        {fieldMemory.salinityRiskLevel === 'moderate' || fieldMemory.salinityRiskLevel === 'severe'
                          ? (lang === 'ar' ? '🔴 ترسبات ملحية: يُوصى بأسمدة سلفات وجبس زراعي' : '🔴 Salinity risk, agricultural gypsum recommended')
                          : (lang === 'ar' ? '🟢 ملوحة طبيعية وآمنة لكافة المحاصيل' : '🟢 Safe normal salinity envelope')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3-Year / 6-Season Smart Crop Rotation Planner */}
                <CropRotationPlanner
                  strategies={strategies}
                  selectedStrategyId={selectedStrategyId}
                  onSelectStrategy={setSelectedStrategyId}
                  areaFeddan={currentAreaFeddan}
                  fieldName={currentFieldName}
                  lang={lang}
                  onOpenWizard={() => {
                    setIsWizardCompleted(false);
                    localStorage.setItem('blinkfarms_wizard_completed', 'false');
                  }}
                  whatIfWaterCutPercent={whatIfWaterCutPercent}
                  setWhatIfWaterCutPercent={setWhatIfWaterCutPercent}
                  whatIfHeatwaveC={whatIfHeatwaveC}
                  setWhatIfHeatwaveC={setWhatIfHeatwaveC}
                />
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
          className="flex flex-col items-center gap-1 text-[11px] font-bold py-1.5 px-3 rounded-2xl transition-all active:scale-95 text-neutral-400 dark:text-neutral-500 hover:text-emerald-500"
        >
          <img src="/blink-ai-logo.png" alt="BlinkAI" className="w-5 h-5 rounded-full object-cover border border-emerald-500/40 shadow-sm" />
          <span>BlinkAI</span>
        </Link>
      </nav>
    </div>
  );
}
