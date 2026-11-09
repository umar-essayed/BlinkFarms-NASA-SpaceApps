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

export interface EgyptianCultivar {
  nameAr: string;
  nameEn: string;
  registrationCode: string;
  suitableRegions: ('delta' | 'middle_egypt' | 'upper_egypt' | 'reclaimed_desert')[];
  maturityDays: number;
  salinityToleranceDsM: number;
  featuresAr: string;
  featuresEn: string;
}

export interface FertilizerDoseStage {
  stageNameAr: string;
  stageNameEn: string;
  daysAfterSowing: string;
  ureaBagsPerFeddan: number;
  nitrateBagsPerFeddan?: number;
  superphosphateBagsPerFeddan: number;
  potassiumSulfateKgPerFeddan: number;
  applicationMethodAr: string;
  applicationMethodEn: string;
  notesAr: string;
  notesEn: string;
}

export interface EgyptianCropProfile {
  cropId: string;
  traditionalUnitAr: 'إردب' | 'قنطار' | 'طن';
  traditionalUnitEn: 'Ardab' | 'Qintar' | 'Metric Ton';
  unitWeightKg: number;
  expectedYieldPerFeddan: {
    min: number;
    max: number;
    average: number;
    traditionalUnitAr: string;
    traditionalUnitEn: string;
    metricTonsAverage: number;
  };
  certifiedCultivars: EgyptianCultivar[];
  sowingWindows: {
    deltaAr: string;
    upperEgyptAr: string;
    desertAr: string;
    optimalRangeEn: string;
  };
  seedRatePerFeddan: {
    amount: string;
    methodAr: string;
    methodEn: string;
  };
  phasedFertilizerSchedule: FertilizerDoseStage[];
  economicsEgp: {
    productionCostPerFeddan: number;
    marketPricePerUnit: number;
    grossRevenuePerFeddan: number;
    netProfitPerFeddan: number;
  };
  soilSynergyNoteAr: string;
  soilSynergyNoteEn: string;
}

export interface Crop {
  id: string;
  nameAr: string;
  nameEn: string;
  family: BotanicalFamily['familyKey'];
  familyNameAr: string;
  familyNameEn: string;
  season: 'summer' | 'winter' | 'perennial' | 'dual';
  
  // Egyptian Agronomic Extension
  egyptianProfile?: EgyptianCropProfile;
  
  // FAO AquaCrop & Photosynthetic Pathway
  c3_c4pathway: 'C3' | 'C4';
  wpNormalizedGm2: number;       // Normalized Water Productivity WP* (g/m^2)
  harvestIndexBase: number;      // Reference Harvest Index HI_0 [0.15 - 0.70]
  tBaseC: number;                // Base temperature for GDD (°C)
  tCritFloweringC: number;       // Critical anthesis temperature threshold (°C)
  gddRequired: number;           // Total Growing Degree Days to physiological maturity
  nFixationKgHa: number;         // Biological N fixation credit left for next crop (kg N/ha)
  nDemandKgHa: number;           // Total required seasonal N fertilizer input (kg N/ha)
  residueOrganicMatterScore: number; // Crop residue score (1 to 10)

  // FAO-56 Water & Biophysical Parameters
  kcIni: number;
  kcMid: number;
  kcEnd: number;
  ky: number;                    // Stewart yield response factor to water stress
  depletionP: number;            // Fraction of TAW that can be depleted before stress
  rootDepthMaxM: number;         // Max root zone depth Zr,max in meters
  
  // EcoCrop & Climate Envelope
  tBase: number;
  tOpt: number;
  tMax: number;
  gddMaturity: number;           // Growing degree days needed to mature
  waterRequirementMm: number;    // Seasonal water requirement (mm)
  
  // Soil & Resilience Characteristics
  salinityToleranceDsM: number;  // EC threshold (dS/m)
  nitrogenFixationKgHa: number;  // Biological N fixation (positive for legumes)
  residueBiomassTonHa: number;   // Crop residue left on field
  waterloggingTolerance: 'low' | 'medium' | 'high';
  
  // Economic / Market Profile
  avgCostPerHa: number;          // In USD
  avgRevenuePerHa: number;       // In USD
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

export interface RotationSeason {
  seasonIndex: 1 | 2 | 3 | 4 | 5 | 6; // 1-6 across the 3 years
  seasonType: 'winter' | 'summer';
  seasonNameAr: string;
  seasonNameEn: string;
  yearNumber: 1 | 2 | 3;
  crop: Crop;
  seasonalWaterNeedM3Ha: number;
  waterSavedVsBaselinePercent: number;
  soilNitrogenDeltaKgHa: number;
  nitrogenCreditReceivedKgHa: number;
  ureaBagsSavedPerFeddan: number;
  yieldBiomassTonHa: number;
  harvestIndexAdj: number;
  yieldActualTonHa: number;
  failureRiskPercent: number;
  netIncomeUsdHa: number;
  transitionReasonAr: string;
  transitionReasonEn: string;
  selectedCultivar?: EgyptianCultivar;
  egyptianProfile?: EgyptianCropProfile;
}

export interface RotationYear {
  year: 1 | 2 | 3;
  crop: Crop; // Primary / winter crop (backwards-compatible)
  winterCrop?: Crop;
  summerCrop?: Crop;
  seasons?: [RotationSeason, RotationSeason];
  seasonalWaterNeedM3Ha: number;
  waterSavedVsBaselinePercent: number;
  soilNitrogenDeltaKgHa: number;
  yieldRatioPredicted: number; // Ya / Ym (0.0 to 1.0)
  failureRiskPercent: number;  // P(Yield < 70%)
  netIncomeUsdHa: number;
  ureaBagsSavedPerFeddan?: number;
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
  seasons: RotationSeason[]; // Full 6-season sequence (3 Years × 2 Seasons)
  
  // Aggregated 3-Year Metrics
  totalWaterUseM3Ha: number;
  totalWaterSavedPercent: number;
  totalWaterSavedM3Feddan: number;
  totalNitrogenAddedKgHa: number;
  totalUreaBagsSavedPerFeddan: number;
  totalFertilizerSavingsEgp: number;
  avgFailureRiskPercent: number;
  totalNetProfitUsdHa: number;
  soilHealthIndexScore: number; // 0 - 100
  topsisCloseness: number;      // Ci in [0, 1]
  biodrillingRemediated: boolean;
  
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

export interface ToolInvocation {
  id?: string;
  name: string;
  labelAr: string;
  labelEn: string;
  status: 'running' | 'success' | 'error';
  input?: any;
  output?: any;
  summaryAr?: string;
  summaryEn?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text?: string;
  content?: string;
  toolsUsed?: ToolInvocation[];
  learnedMemory?: string[];
  suggestedAction?: {
    actionType: 'show_alert' | 'view_rotations' | 'change_preferences' | 'irrigate_now';
    labelAr: string;
    labelEn: string;
  };
}

export interface UnifiedFarmVitals {
  fieldId: string;
  fieldNameAr: string;
  fieldNameEn: string;
  coordinates: [number, number];
  areaFeddan: number;
  lastUpdatedIso: string;

  // Integrated Thermodynamics (Air vs Canopy)
  temperature: {
    ambientAirC: number;           // NASA POWER T_air
    ambientMaxC: number;
    ambientMinC: number;
    canopyTempC: number;           // ECOSTRESS T_c
    deltaTC: number;               // Delta T = T_c - T_air (Canopy fever / cooling differential)
    thermodynamicState: 'cooling_efficiently' | 'mild_warming' | 'fever_shutdown';
    summaryAr: string;
    summaryEn: string;
  };

  // Plant Hydrology & Stomatal Dynamics
  hydrology: {
    evaporativeStressIndex: number;// ESI (0.0 - 1.0)
    deltaESI7d: number;            // 7-day velocity of stress collapse
    rootZoneMoistureMm: number;    // SMAP 30m downscaled root moisture
    rootZoneMoisturePercent: number;// Percentage of Total Available Water (TAW)
    subsoilStatus: 'abundant' | 'adequate' | 'deficit_deep_irrigation_needed';
    summaryAr: string;
    summaryEn: string;
  };

  // Unified Irrigation Prescription (FAO-56 Dual Kc)
  irrigationPrescription: {
    depthMm: number;               // Calculated evaporative replacement depth
    volumePerFeddanM3: number;     // depthMm * 4.20083
    volumeTotalFieldM3: number;    // volumePerFeddanM3 * areaFeddan
    urgencyLevel: 'routine_maintenance' | 'early_deficit_replenish' | 'emergency_quenching';
    optimalWindowAr: string;       // e.g. "مع طراوة الفجر (5:00 - 7:30 ص)"
    optimalWindowEn: string;
    summaryAr: string;
    summaryEn: string;
  };

  // Unified Agrochemical Spray Window (Single Source of Truth)
  sprayWindow: {
    isSafeToSpray: boolean;        // True ONLY if wind <= 15 km/h AND rain < 0.2 mm AND temp <= 32C AND !isFlashDroughtAlert
    windSpeedKmH: number;
    relativeHumidityPct: number;
    rainMm: number;
    fungalSporeRisk: 'low' | 'moderate' | 'high';
    verdictAr: string;
    verdictEn: string;
    recommendedTimeSlotAr: string;
    recommendedTimeSlotEn: string;
  };

  // Early Flash Drought Threat Detection
  flashDroughtThreat: {
    level: 1 | 2 | 3;              // 1: Stable, 2: Watch (48h), 3: Alert (Canopy Fever)
    isAlert: boolean;
    daysToIrreversibleBrowning: number; // e.g. 14 days lead time over NDVI
    currentNDVI: number;
    warningNarrativeAr: string;
    warningNarrativeEn: string;
  };
}

