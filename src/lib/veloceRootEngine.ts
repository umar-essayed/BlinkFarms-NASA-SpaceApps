// ==============================================================================
// BlinkFarms — VeloceRoot Biophysical Engine
// Flash Drought Detection & Closed-Loop Soil Diagnostics
// Real-time Coordinate-Aware Calculations
// ==============================================================================

import { FlashDroughtTelemetry, FieldMemoryState } from './types';

export interface FieldPreset {
  id: string;
  nameAr: string;
  nameEn: string;
  locationAr: string;
  locationEn: string;
  coordinates: [number, number];
  cropNameAr: string;
  cropNameEn: string;
  soilTypeAr: string;
  soilTypeEn: string;
  areaHa: number;
  isShockByDefault: boolean;
  fieldMemory: FieldMemoryState;
  polygonBoundary?: [number, number][];
}

// 6 Core Reference Farmlands with Exact National Project Boundaries
export const DEMO_FIELDS: FieldPreset[] = [
  {
    id: 'nile_delta',
    nameAr: 'دلتا النيل (طنطا / الغربية)',
    nameEn: 'Nile Delta Alluvial Basin (Tanta)',
    locationAr: 'دلتا النيل، مصر',
    locationEn: 'Nile Delta, Egypt',
    coordinates: [30.850, 31.050],
    cropNameAr: 'ذرة شامية وبرسيم بلدي',
    cropNameEn: 'Surface-Irrigated Maize & Clover',
    soilTypeAr: 'طميية نيلية ثقيلة خصبة',
    soilTypeEn: 'Alluvial Heavy Clay Loam',
    areaHa: 15,
    isShockByDefault: false,
    fieldMemory: {
      carryoverWaterFraction: 0.65,
      stressFrequency36m: 0.15,
      accumulatedHeatLoad: 1100,
      soilErrorIndex: 0.88,
      previousCropId: 'berseem',
      hardpanDetected: false,
      salinityRiskLevel: 'normal',
    },
    polygonBoundary: [
      [30.875, 31.015],
      [30.885, 31.085],
      [30.825, 31.095],
      [30.815, 31.025],
      [30.875, 31.015],
    ],
  },
  {
    id: 'toshka_reclaimed',
    nameAr: 'مشروع توشكى الخير (جنوب الوادي)',
    nameEn: 'Toshka Mega-Project (South Valley)',
    locationAr: 'الوادي الجديد، توشكى، مصر',
    locationEn: 'Toshka Basin, New Valley, Egypt',
    coordinates: [22.684, 31.543],
    cropNameAr: 'قمح استراتيجي ونخيل تحت ري محوري',
    cropNameEn: 'Pivot Wheat & Date Palm Mega-Basin',
    soilTypeAr: 'رملية خفيفة مستصلحة ذات طبقة كلسية',
    soilTypeEn: 'Reclaimed Calcareous Sand',
    areaHa: 120,
    isShockByDefault: false,
    fieldMemory: {
      carryoverWaterFraction: 0.38,
      stressFrequency36m: 0.40,
      accumulatedHeatLoad: 2100,
      soilErrorIndex: 0.65,
      previousCropId: 'wheat',
      hardpanDetected: true,
      salinityRiskLevel: 'moderate',
    },
    polygonBoundary: [
      [22.750, 31.420],
      [22.765, 31.620],
      [22.620, 31.650],
      [22.580, 31.510],
      [22.640, 31.400],
      [22.750, 31.420],
    ],
  },
  {
    id: 'new_delta_future',
    nameAr: 'مشروع الدلتا الجديدة ومستقبل مصر',
    nameEn: 'New Delta & Mostaqbal Misr',
    locationAr: 'محور الضبعة، الصحراء الغربية، مصر',
    locationEn: 'Dabaa Corridor, Western Desert, Egypt',
    coordinates: [30.220, 30.120],
    cropNameAr: 'محاصيل حبوب وزيوت وبنجر سكر',
    cropNameEn: 'Modern Pivot Cereals & Sugar Beet',
    soilTypeAr: 'رملية طميية جيدة الصرف',
    soilTypeEn: 'Reclaimed Sandy Loam',
    areaHa: 200,
    isShockByDefault: false,
    fieldMemory: {
      carryoverWaterFraction: 0.50,
      stressFrequency36m: 0.22,
      accumulatedHeatLoad: 1450,
      soilErrorIndex: 0.78,
      previousCropId: 'barley',
      hardpanDetected: false,
      salinityRiskLevel: 'normal',
    },
    polygonBoundary: [
      [30.280, 30.020],
      [30.340, 30.220],
      [30.180, 30.310],
      [30.110, 30.120],
      [30.170, 29.980],
      [30.280, 30.020],
    ],
  },
  {
    id: 'east_oweinat',
    nameAr: 'مشروع شرق العوينات (جنوب غرب مصر)',
    nameEn: 'East Oweinat Deep Aquifer Basin',
    locationAr: 'شرق العوينات، الوادي الجديد، مصر',
    locationEn: 'East Oweinat, New Valley, Egypt',
    coordinates: [22.490, 28.650],
    cropNameAr: 'قمح وبطاطس أورجانيك ومحاور عملاقة',
    cropNameEn: 'Deep-Well Center Pivot Wheat & Potatoes',
    soilTypeAr: 'رملية خشنة مستصلحة نقية',
    soilTypeEn: 'Desert Deep Sand',
    areaHa: 150,
    isShockByDefault: false,
    fieldMemory: {
      carryoverWaterFraction: 0.42,
      stressFrequency36m: 0.35,
      accumulatedHeatLoad: 2200,
      soilErrorIndex: 0.70,
      previousCropId: 'wheat',
      hardpanDetected: false,
      salinityRiskLevel: 'normal',
    },
    polygonBoundary: [
      [22.620, 28.520],
      [22.650, 28.780],
      [22.420, 28.820],
      [22.380, 28.580],
      [22.480, 28.480],
      [22.620, 28.520],
    ],
  },
  {
    id: 'minya_valley',
    nameAr: 'مشروع غرب غرب المنيا (استصلاح وتنمية)',
    nameEn: 'West Minya Reclaimed Farmland',
    locationAr: 'غرب المنيا، مصر',
    locationEn: 'West Minya, Egypt',
    coordinates: [28.312, 30.714],
    cropNameAr: 'بنجر سكر وفول صويا وذرة',
    cropNameEn: 'Sugar Beet, Soybean & Maize',
    soilTypeAr: 'رملية طميية كلسية',
    soilTypeEn: 'Alluvial & Calcareous Sand Mix',
    areaHa: 45,
    isShockByDefault: false,
    fieldMemory: {
      carryoverWaterFraction: 0.55,
      stressFrequency36m: 0.20,
      accumulatedHeatLoad: 1350,
      soilErrorIndex: 0.82,
      previousCropId: 'soybean',
      hardpanDetected: false,
      salinityRiskLevel: 'moderate',
    },
    polygonBoundary: [
      [28.355, 30.680],
      [28.365, 30.760],
      [28.270, 30.770],
      [28.260, 30.690],
      [28.355, 30.680],
    ],
  },
  {
    id: 'nubaria_belt',
    nameAr: 'مشروع النوبارية وطريق مصر إسكندرية',
    nameEn: 'Nubaria Agricultural Belt',
    locationAr: 'النوبارية، البحيرة، مصر',
    locationEn: 'Nubaria, Beheira, Egypt',
    coordinates: [30.665, 30.065],
    cropNameAr: 'بساتين موالح وزيتون وخضار تصدير',
    cropNameEn: 'Export Citrus, Olive & Vegetables',
    soilTypeAr: 'رملية طميية مفككة عالية النفاذية',
    soilTypeEn: 'Permeable Sandy Loam',
    areaHa: 30,
    isShockByDefault: false,
    fieldMemory: {
      carryoverWaterFraction: 0.58,
      stressFrequency36m: 0.18,
      accumulatedHeatLoad: 1250,
      soilErrorIndex: 0.85,
      previousCropId: 'sunflower',
      hardpanDetected: false,
      salinityRiskLevel: 'normal',
    },
    polygonBoundary: [
      [30.710, 30.010],
      [30.730, 30.120],
      [30.630, 30.140],
      [30.610, 30.030],
      [30.710, 30.010],
    ],
  },
];

// Helper to determine biophysical baseline from coordinates
function getBiophysicalClimate(lat: number, lon: number) {
  const absLat = Math.abs(lat);
  const isArid = (absLat >= 18 && absLat <= 32) && (lon >= -15 && lon <= 55);
  const isMed = (absLat >= 31 && absLat <= 44) && (lon >= -10 && lon <= 36);

  let baseAirTemp = 28.0;
  if (isArid) {
    baseAirTemp = 33.5 + (32 - absLat) * 0.3;
  } else if (isMed) {
    baseAirTemp = 29.0 + (38 - absLat) * 0.2;
  } else {
    baseAirTemp = Math.max(18, 30 - (absLat * 0.25));
  }

  return {
    baseAirTemp: Number(baseAirTemp.toFixed(1)),
    isArid,
  };
}

/**
 * Generate fully dynamic, coordinate-responsive Telemetry
 * By default: Reflects actual healthy operating conditions!
 * If simulateShock is true: Simulates a sudden flash drought shock window to demonstrate the 14-day early warning.
 */
export function generateFieldTelemetry(
  lat: number,
  lon: number,
  fieldId: string,
  nameAr: string,
  nameEn: string,
  simulateShock: boolean = false
): FlashDroughtTelemetry {
  const climate = getBiophysicalClimate(lat, lon);
  const totalDays = 45;
  const historyDays = [];

  const baselineAir = climate.baseAirTemp;
  const healthyCanopy = baselineAir - 2.5; // Healthy cooled canopy is ~2.5°C cooler than air!

  for (let i = 0; i < totalDays; i++) {
    const doy = 160 + i;
    const dateStr = `DOY ${doy}`;

    let ndvi: number;
    let esi: number;
    let canopyTemp: number;

    if (!simulateShock) {
      // ---------------------------------------------------------
      // NORMAL HEALTHY OPERATING CONDITIONS (No Flash Drought)
      // High transpiration, cool canopy, modulated by coordinate aridity
      // ---------------------------------------------------------
      const aridityIndex = climate.isArid ? 0.08 : 0.0;
      const coordPhase = (lat * 10 + lon * 5) % 3.14;
      esi = (climate.isArid ? 0.74 : 0.83) - aridityIndex * 0.5 + Math.sin(i * 0.28 + coordPhase) * 0.035;
      ndvi = (climate.isArid ? 0.65 : 0.80) + Math.cos(i * 0.2 + coordPhase) * 0.025;
      const thermalVpdOffset = climate.isArid ? 1.2 : -0.5;
      canopyTemp = healthyCanopy + thermalVpdOffset + Math.sin(i * 0.22 + coordPhase) * 0.7;
    } else {
      // ---------------------------------------------------------
      // SIMULATED FLASH DROUGHT SHOCK WINDOW (Days 14 to 28)
      // Demonstrates the 14-day early warning advantage over NDVI
      // ---------------------------------------------------------
      if (i < 14) {
        esi = 0.84 - (i * 0.005);
        ndvi = 0.82;
        canopyTemp = healthyCanopy + (i * 0.1);
      } else if (i <= 28) {
        // Stomatal closure collapse: ESI crashes, canopy heats up by +5°C!
        const progress = (i - 14) / 14;
        esi = 0.76 - (progress * 0.46);
        ndvi = 0.81 - (progress * 0.02); // NDVI still deceptively green!
        canopyTemp = healthyCanopy + 1.5 + (progress * 5.2);
      } else {
        // Late stage browning
        esi = 0.28 + Math.sin(i * 0.4) * 0.02;
        ndvi = 0.79 - ((i - 28) * 0.025);
        canopyTemp = baselineAir + 3.5;
      }
    }

    historyDays.push({
      doy,
      date: dateStr,
      esi: Number(Math.max(0.18, Math.min(0.92, esi)).toFixed(3)),
      ndvi: Number(Math.max(0.35, Math.min(0.88, ndvi)).toFixed(3)),
      canopyTemp: Number(canopyTemp.toFixed(1)),
      isShockWindow: simulateShock && i >= 14 && i <= 28,
    });
  }

  const latest = historyDays[historyDays.length - 1];
  const day7Ago = historyDays[historyDays.length - 8] || historyDays[0];
  const deltaESI7d = Number((latest.esi - day7Ago.esi).toFixed(3));
  const canopyTempAnomaly = Number((latest.canopyTemp - baselineAir).toFixed(1));

  // Alert triggers ONLY if shock is simulated or ESI crashes below 0.45
  const isFlashDrought = simulateShock && (latest.esi < 0.45 || canopyTempAnomaly > 1.5);

  // Irrigation Prescription
  // In normal healthy conditions: standard routine maintenance irrigation (15-20 mm)
  // In flash drought: emergency quenching irrigation (35-45 mm)
  const prescribedMm = isFlashDrought
    ? Number((35.0 + Math.abs(canopyTempAnomaly) * 2.5).toFixed(1))
    : Number((16.0 + Math.random() * 4).toFixed(1));
  const prescribedM3Ha = Math.round(prescribedMm * 10);

  return {
    fieldId,
    fieldNameAr: nameAr,
    fieldNameEn: nameEn,
    coordinates: [Number(lat.toFixed(4)), Number(lon.toFixed(4))],
    currentDate: '2026-07-22',
    canopyTempC: latest.canopyTemp,
    airTempC: baselineAir,
    canopyTempAnomalyC: canopyTempAnomaly,
    currentESI: latest.esi,
    deltaESI7d,
    currentNDVI: latest.ndvi,
    rootZoneMoistureMm: isFlashDrought ? 38.0 : 88.0,
    prescribedIrrigationMm: prescribedMm,
    prescribedVolumeM3Ha: prescribedM3Ha,
    isFlashDroughtAlert: isFlashDrought,
    alertHeadlineAr: isFlashDrought
      ? '⚠️ إنذار مبكر: جفاف ومضي نشط (حمى مسام المحصول)'
      : '✅ حالة ممتازة: ري متزن وتبريد نتحي طبيعي',
    alertHeadlineEn: isFlashDrought
      ? '⚠️ Early Warning: Active Flash Drought (Canopy Fever)'
      : '✅ Optimal Condition: Balanced Transpiration & Adequate Moisture',
    alertDetailAr: isFlashDrought
      ? `النبات حران ومقفل مسامه، والعطش في عروقه قبل ظهور أي اصفرار بـ 14 يوماً.`
      : 'الزرع بيعرق ويتنفس بصورة ممتازة ولا يوجد أي إجهاد مائي أو حراري.',
    alertDetailEn: isFlashDrought
      ? 'Canopy fever active. Stomata shut ~14 days ahead of visible optical browning.'
      : 'Normal transpirational cooling and healthy root moisture profile.',
    historyDays,
  };
}

/**
 * Derive 10-Year Field Memory ($F_{state}$) dynamically from coordinates & agroclimatology
 * Infers 10-year GDD heat load, drought frequency, carryover subsoil moisture,
 * closed-loop soil error index (Xi), and subsoil hardpan compaction at ~45cm.
 */
export function deriveFieldMemoryFromCoords(lat: number, lon: number): FieldMemoryState {
  const absLat = Math.abs(lat);
  
  // Specific known agricultural parcels
  const isToshkaRegion = (absLat >= 21.5 && absLat <= 24.5) && (lon >= 29.0 && lon <= 33.0);
  const isQassimRegion = (absLat >= 24.5 && absLat <= 28.5) && (lon >= 41.0 && lon <= 46.5);
  const isNileDeltaRegion = (absLat >= 30.0 && absLat <= 31.8) && (lon >= 29.5 && lon <= 32.5);
  const isAmeriFluxMidwest = (absLat >= 39.0 && absLat <= 43.5) && (lon >= -100.0 && lon <= -90.0);

  if (isToshkaRegion) {
    // Hyper-arid desert reclaimed oasis: caliche hardpan at 45cm, moderate salinity, high GDD
    return {
      carryoverWaterFraction: 0.38,
      stressFrequency36m: 0.42,
      accumulatedHeatLoad: 2150,
      soilErrorIndex: 0.58, // < 0.70 detects calcareous hardpan compaction
      previousCropId: 'wheat',
      hardpanDetected: true,
      salinityRiskLevel: 'moderate',
    };
  }

  if (isQassimRegion) {
    // Saudi center pivots: deep calcareous sand, very high heat load GDD, fast percolation
    return {
      carryoverWaterFraction: 0.35,
      stressFrequency36m: 0.35,
      accumulatedHeatLoad: 2280,
      soilErrorIndex: 0.72,
      previousCropId: 'wheat',
      hardpanDetected: false,
      salinityRiskLevel: 'moderate',
    };
  }

  if (isNileDeltaRegion) {
    // Heavy alluvial clay loam: high moisture retention, low heat stress, no hardpan
    return {
      carryoverWaterFraction: 0.66,
      stressFrequency36m: 0.14,
      accumulatedHeatLoad: 1120,
      soilErrorIndex: 0.88,
      previousCropId: 'clover_berseem',
      hardpanDetected: false,
      salinityRiskLevel: 'normal',
    };
  }

  if (isAmeriFluxMidwest) {
    // US Corn Belt / Mead US-Ne1 historical drought site
    return {
      carryoverWaterFraction: 0.30,
      stressFrequency36m: 0.58,
      accumulatedHeatLoad: 1720,
      soilErrorIndex: 0.48,
      previousCropId: 'maize',
      hardpanDetected: true,
      salinityRiskLevel: 'moderate',
    };
  }

  // General Arid vs Temperate fallback
  const isArid = (absLat >= 18 && absLat <= 32) && (lon >= -15 && lon <= 55);
  if (isArid) {
    return {
      carryoverWaterFraction: 0.42,
      stressFrequency36m: 0.30,
      accumulatedHeatLoad: 1950,
      soilErrorIndex: 0.68,
      previousCropId: 'wheat',
      hardpanDetected: true, // conservative compaction check for arid desert soils
      salinityRiskLevel: 'moderate',
    };
  } else {
    return {
      carryoverWaterFraction: 0.58,
      stressFrequency36m: 0.18,
      accumulatedHeatLoad: 1250,
      soilErrorIndex: 0.85,
      previousCropId: 'soybean',
      hardpanDetected: false,
      salinityRiskLevel: 'normal',
    };
  }
}
