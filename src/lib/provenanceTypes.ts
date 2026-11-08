/**
 * BlinkFarms Provenance & Data State Contract
 * Standardized metadata adhering to NASA Space Apps 2026 scientific integrity requirements.
 */

export type DataState = 'LIVE' | 'HISTORICAL' | 'ESTIMATED' | 'SIMULATED' | 'USER_INPUT';

export type QualityStatus = 'measured_high' | 'provisional' | 'regional_proxy' | 'modeled_derived' | 'synthetic_fixture';

export interface ProvenanceRecord<T = number> {
  value: T;
  unit: string;
  variable: string;
  data_state: DataState;
  source_name: string;
  source_product: string;
  source_url?: string;
  retrieved_at: string;
  observation_time: string;
  spatial_resolution: string;
  temporal_resolution: string;
  quality_status: QualityStatus;
  processing_method: string;
  uncertainty_description?: string;
  limitations: string;
  missing_reason?: string;
}

export interface DailyWeatherObservation {
  date: string;
  t_air_mean_c: ProvenanceRecord<number>;
  t_air_max_c: ProvenanceRecord<number>;
  t_air_min_c: ProvenanceRecord<number>;
  rh_pct: ProvenanceRecord<number>;
  solar_rad_wm2: ProvenanceRecord<number>;
  wind_speed_ms: ProvenanceRecord<number>;
  precipitation_mm: ProvenanceRecord<number>;
}

export interface FieldBiophysicalState {
  fieldId: string;
  fieldName: string;
  coordinates: [number, number];
  areaFeddan: number;
  lastObservationDate: string;
  weather: DailyWeatherObservation;
  canopyTempC: ProvenanceRecord<number>;
  canopyFeverAnomalyC: ProvenanceRecord<number>;
  evaporativeRatio: ProvenanceRecord<number>; // r_ET = ET_a / PET (0 to 1)
  waterStressIndex: ProvenanceRecord<number>; // WSI = 1 - r_ET (0 to 1)
  prescribedIrrigationMm: ProvenanceRecord<number>;
  prescribedIrrigationM3Feddan: ProvenanceRecord<number>;
  subsoilCondition: {
    hardpanRisk: 'low' | 'moderate' | 'high_suspected' | 'unknown';
    subsoilMoistureState: 'optimal' | 'moderate' | 'depleted';
    salinityRisk: 'safe' | 'elevated' | 'severe' | 'untested';
    basis: 'farmer_reported' | 'regional_soil_survey_proxy' | 'in_situ_test';
    limitations: string;
  };
  flashDroughtAlert: {
    active: boolean;
    severity: 'none' | 'watch' | 'warning' | 'emergency';
    velocity7d: number; // rate of change in WSI
    leadTimeDaysEstimated: number;
    explanationAr: string;
    explanationEn: string;
    basis: string;
  };
}
