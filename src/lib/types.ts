// ==============================================================================
// BlinkFarms — Core Types & Interfaces
// Definitive Engineering & Agroclimatology Architecture
// ==============================================================================

export type Language = 'ar' | 'en';

export interface BotanicalFamily {
  familyKey: 'poaceae' | 'fabaceae' | 'solanaceae' | 'asteraceae' | 'brassicaceae' | 'malvaceae';
  nameAr: string;
  nameEn: string;
}

export interface Crop {
  id: string;
  nameAr: string;
  nameEn: string;
  family: BotanicalFamily['familyKey'];
  familyNameAr: string;
  familyNameEn: string;
  season: 'summer' | 'winter' | 'perennial';
  
  // FAO-56 Water & Biophysical Parameters
  kcIni: number;
  kcMid: number;
  kcEnd: number;
  ky: number;              // Stewart yield response factor to water stress
  depletionP: number;      // Fraction of TAW that can be depleted before stress
  rootDepthMaxM: number;   // Max root zone depth Zr,max in meters
  
  // EcoCrop & Climate Envelope
  tBase: number;
  tOpt: number;
  tMax: number;
  gddMaturity: number;     // Growing degree days needed to mature
  waterRequirementMm: number; // Seasonal water requirement (mm)
  
  // Soil & Resilience Characteristics
  salinityToleranceDsM: number; // EC threshold (dS/m)
  nitrogenFixationKgHa: number; // Biological N fixation (positive for legumes)
  residueBiomassTonHa: number;  // Crop residue left on field
  waterloggingTolerance: 'low' | 'medium' | 'high';
  
  // Economic / Market Profile
  avgCostPerHa: number;    // In USD
  avgRevenuePerHa: number; // In USD
  marketLiquidity: 'high' | 'medium' | 'low';

  // Agro-Ecological Region Envelope
  suitableRegions?: ('mena_arid' | 'mediterranean' | 'temperate_us')[];
}

export interface FieldMemoryState {
  carryoverWaterFraction: number; // Phi_carryover (0.0 to 1.0)
  stressFrequency36m: number;      // S_freq (fraction of days with ESI < 0.40)
  accumulatedHeatLoad: number;    // H_accum in degree-days
  soilErrorIndex: number;         // Xi_soil_error (Closed-loop probing after 48h)
  previousCropId: string;         // Last harvested crop
  hardpanDetected: boolean;       // Extracted from Xi_soil_error < 0.70
  salinityRiskLevel: 'normal' | 'moderate' | 'severe';
}

export interface RotationYear {
  year: 1 | 2 | 3;
  crop: Crop;
  seasonalWaterNeedM3Ha: number;
  waterSavedVsBaselinePercent: number;
  soilNitrogenDeltaKgHa: number;
  yieldRatioPredicted: number; // Ya / Ym (0.0 to 1.0)
  failureRiskPercent: number;  // P(Yield < 70%)
  netIncomeUsdHa: number;
}

export interface RotationStrategy {
  id: 'current' | 'balanced' | 'water_saving';
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  years: [RotationYear, RotationYear, RotationYear];
  
  // Aggregated 3-Year Metrics
  totalWaterUseM3Ha: number;
  totalWaterSavedPercent: number;
  totalNitrogenAddedKgHa: number;
  avgFailureRiskPercent: number;
  totalNetProfitUsdHa: number;
  soilHealthIndexScore: number; // 0 - 100
  topsisCloseness: number;      // Ci in [0, 1]
  
  // Explainability & NASA Considerations
  evidenceSummaryAr: string;
  evidenceSummaryEn: string;
  risksAndGapsAr: string;
  risksAndGapsEn: string;
}

export interface FlashDroughtTelemetry {
  fieldId: string;
  fieldNameAr: string;
  fieldNameEn: string;
  coordinates: [number, number]; // [lat, lon]
  currentDate: string;
  
  // Current Remote Sensing Real-Time Values
  canopyTempC: number;           // ECOSTRESS Tc
  airTempC: number;              // NASA POWER Tair
  canopyTempAnomalyC: number;    // Fever: Tc - Tbaseline (+2 to +8°C)
  currentESI: number;            // ECOSTRESS Evaporative Stress Index (0.0 - 1.0)
  deltaESI7d: number;            // 7-day velocity of stress collapse
  currentNDVI: number;           // HLS Greenness (still green during shock)
  rootZoneMoistureMm: number;    // SMAP 30m downscaled root moisture
  prescribedIrrigationMm: number;// Recommended irrigation depth to quench deficit
  prescribedVolumeM3Ha: number;  // Volume per hectare
  
  // Alert Signals
  isFlashDroughtAlert: boolean;
  alertHeadlineAr: string;
  alertHeadlineEn: string;
  alertDetailAr: string;
  alertDetailEn: string;
  
  // Time Series Comparison (NDVI vs ESI over 60 days to prove 14-day lead time)
  historyDays: Array<{
    doy: number;
    date: string;
    esi: number;
    ndvi: number;
    canopyTemp: number;
    isShockWindow: boolean;
  }>;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text?: string;
  content?: string;
  suggestedAction?: {
    actionType: 'show_alert' | 'view_rotations' | 'change_preferences' | 'irrigate_now';
    labelAr: string;
    labelEn: string;
  };
}
