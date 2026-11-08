// ==============================================================================
// BlinkFarms — FieldShift Engine Deterministic Unit Tests
// Validating 6-Season Winter/Summer alternation, FAO AquaCrop water productivity,
// DSSAT N-credit carryover, hardpan bio-drilling, and dynamic TOPSIS optimization.
// NASA Space Apps Challenge 2026: Field Shift
// ==============================================================================

import { simulateRotationStrategies, DEFAULT_PRIORITIES } from '../src/lib/fieldShiftEngine';
import { FieldMemoryState } from '../src/lib/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('🧪 Starting FieldShift Next-Gen Agro-Simulation Verification Tests...\n');

// ----------------------------------------------------------------------------
// Test 1: Standard Egyptian Nile Delta Field (6-Season Alternation & Metrics)
// ----------------------------------------------------------------------------
console.log('Test 1: Standard Nile Delta Farm (lat: 30.85, lon: 31.05)');
const standardMemory: FieldMemoryState = {
  carryoverWaterFraction: 0.65,
  stressFrequency36m: 0.12,
  accumulatedHeatLoad: 1200,
  soilErrorIndex: 0.88,
  previousCropId: 'maize',
  hardpanDetected: false,
  salinityRiskLevel: 'normal',
};

const standardStrategies = simulateRotationStrategies(standardMemory, DEFAULT_PRIORITIES, 30.85, 31.05);
assert(standardStrategies.length === 3, 'Must return exactly 3 strategies');

const [recStd, waterStd, monoStd] = standardStrategies;

assert(recStd.id === 'balanced', 'Strategy 1 must be balanced');
assert(waterStd.id === 'water_saving', 'Strategy 2 must be water_saving');
assert(monoStd.id === 'current', 'Strategy 3 must be current monoculture');

// 6-Season structure verification
assert(recStd.seasons.length === 6, 'Must generate exactly 6 seasons (3 Years × 2 Seasons)');
for (let i = 0; i < 6; i++) {
  const season = recStd.seasons[i];
  if (i % 2 === 0) {
    assert(
      season.seasonType === 'winter',
      `Slot ${i} must be winter season, got ${season.seasonType}`
    );
    assert(
      season.crop.season === 'winter' || season.crop.season === 'perennial' || season.crop.season === 'dual',
      `Winter slot ${i} must host a winter/perennial crop, got ${season.crop.id}`
    );
  } else {
    assert(
      season.seasonType === 'summer',
      `Slot ${i} must be summer season, got ${season.seasonType}`
    );
    assert(
      season.crop.season === 'summer' || season.crop.season === 'perennial' || season.crop.season === 'dual',
      `Summer slot ${i} must host a summer/perennial crop, got ${season.crop.id}`
    );
  }
}

// Dynamic values check
assert(recStd.totalWaterSavedPercent > 0, 'Balanced rotation must save water vs monoculture');
assert(waterStd.totalWaterSavedPercent >= recStd.totalWaterSavedPercent, 'Water saving strategy must save as much or more water');
assert(recStd.soilHealthIndexScore > monoStd.soilHealthIndexScore, 'Soil health of rotation must exceed monoculture');
assert(recStd.avgFailureRiskPercent < monoStd.avgFailureRiskPercent, 'Rotation failure risk must be lower than monoculture');
assert(recStd.topsisCloseness > 0 && recStd.topsisCloseness <= 1.0, 'TOPSIS score must be in (0, 1]');
console.log(`  ✓ Nile Delta 6-Season Alternation: Balanced TOPSIS=${recStd.topsisCloseness}, Water Saved=${recStd.totalWaterSavedPercent}%, SoilHealth=${recStd.soilHealthIndexScore}, FailureRisk=${recStd.avgFailureRiskPercent}%`);

// ----------------------------------------------------------------------------
// Test 2: DSSAT Nitrogen Carryover & Saved Urea Bags
// ----------------------------------------------------------------------------
console.log('\nTest 2: DSSAT Multi-Seasonal Nitrogen Carryover');
assert(recStd.totalUreaBagsSavedPerFeddan > 0, 'Legume-rotation must yield positive saved Urea bags per feddan');
assert(recStd.totalFertilizerSavingsEgp > 0, 'Fertilizer savings EGP must be strictly positive');
console.log(`  ✓ DSSAT N-Credit Verified: Saved ${recStd.totalUreaBagsSavedPerFeddan} Urea bags/feddan (~${recStd.totalFertilizerSavingsEgp} EGP/feddan)`);

// ----------------------------------------------------------------------------
// Test 3: Severe Salinity Field (Reclaimed Desert Land)
// ----------------------------------------------------------------------------
console.log('\nTest 3: High Salinity Soil (salinityRiskLevel: severe)');
const salineMemory: FieldMemoryState = {
  carryoverWaterFraction: 0.40,
  stressFrequency36m: 0.35,
  accumulatedHeatLoad: 1550,
  soilErrorIndex: 0.75,
  previousCropId: 'barley',
  hardpanDetected: false,
  salinityRiskLevel: 'severe',
};

const salineStrategies = simulateRotationStrategies(salineMemory, DEFAULT_PRIORITIES, 30.50, 31.80);
for (const s of salineStrategies[0].seasons) {
  assert(s.crop.salinityToleranceDsM >= 4.5, `Crop ${s.crop.id} in severe salinity must be halotolerant (>=4.5 dS/m)`);
}
console.log(`  ✓ High Salinity Halotolerance Verified: ${salineStrategies[0].seasons.map(s => s.crop.nameEn).join(' -> ')}`);

// ----------------------------------------------------------------------------
// Test 4: Subsoil Hardpan Compaction Bio-Drilling
// ----------------------------------------------------------------------------
console.log('\nTest 4: Subsoil Hardpan Bio-Drilling');
const hardpanMemory: FieldMemoryState = {
  carryoverWaterFraction: 0.50,
  stressFrequency36m: 0.20,
  accumulatedHeatLoad: 1300,
  soilErrorIndex: 0.52, // Hardpan signal
  previousCropId: 'maize',
  hardpanDetected: true,
  salinityRiskLevel: 'normal',
};

const hardpanStrategies = simulateRotationStrategies(hardpanMemory, DEFAULT_PRIORITIES, 30.85, 31.05);
const hasDeepRooter = hardpanStrategies[0].seasons.some(s => s.crop.rootDepthMaxM >= 1.6);
assert(hasDeepRooter, 'Hardpan field rotation must incorporate a deep bio-drilling taproot crop (>=1.6m)');
assert(hardpanStrategies[0].biodrillingRemediated === true, 'Hardpan must be remediated via bio-drilling');
console.log(`  ✓ Hardpan Bio-Drilling Verified: Taproot depth: ${hardpanStrategies[0].seasons.find(s => s.crop.rootDepthMaxM >= 1.6)?.crop.nameEn}`);

// ----------------------------------------------------------------------------
// Test 5: FAO AquaCrop Heat Shock Sensitivity (+3.5°C Heatwave What-If)
// ----------------------------------------------------------------------------
console.log('\nTest 5: AquaCrop Climate Heatwave Sensitivity (+3.5°C)');
const baselineNoHeat = simulateRotationStrategies(standardMemory, DEFAULT_PRIORITIES, 30.85, 31.05, 0, 0);
const heatwaveSim = simulateRotationStrategies(standardMemory, DEFAULT_PRIORITIES, 30.85, 31.05, 0, 3.5);

// Heatwave must penalize monoculture failure risk
assert(heatwaveSim[2].avgFailureRiskPercent >= baselineNoHeat[2].avgFailureRiskPercent, 'Monoculture risk must rise under +3.5°C heat shock');
console.log(`  ✓ Heatwave Shock Verified: Baseline Risk=${baselineNoHeat[2].avgFailureRiskPercent}% -> Heatwave Shock Risk=${heatwaveSim[2].avgFailureRiskPercent}%`);

console.log('\n🎉 ALL 5 NEXT-GEN AGRO-SIMULATION TESTS PASSED SUCCESFULLY!\n');
