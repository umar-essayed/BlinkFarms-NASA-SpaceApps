// ==============================================================================
// BlinkFarms — FieldShift Engine Deterministic Unit Tests
// Validating dynamic crop sequence synthesis, hardpan bio-drilling,
// salinity filtering, and dynamic TOPSIS optimization.
// ==============================================================================

import { simulateRotationStrategies, DEFAULT_PRIORITIES } from '../src/lib/fieldShiftEngine';
import { FieldMemoryState } from '../src/lib/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('🧪 Starting FieldShift Rotation Engine Verification Tests...\n');

// ----------------------------------------------------------------------------
// Test 1: Standard Egyptian Nile Delta Field (Normal Salinity, No Hardpan)
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

// Dynamic values check
assert(recStd.totalWaterSavedPercent > 0, 'Balanced rotation must save water vs monoculture');
assert(waterStd.totalWaterSavedPercent >= recStd.totalWaterSavedPercent, 'Water saving strategy must save as much or more water');
assert(recStd.soilHealthIndexScore > monoStd.soilHealthIndexScore, 'Soil health of rotation must exceed monoculture');
assert(recStd.avgFailureRiskPercent < monoStd.avgFailureRiskPercent, 'Rotation failure risk must be lower than monoculture');
assert(recStd.topsisCloseness > 0 && recStd.topsisCloseness <= 1.0, 'TOPSIS score must be in (0, 1]');
console.log(`  ✓ Nile Delta: Balanced TOPSIS=${recStd.topsisCloseness}, Water Saved=${recStd.totalWaterSavedPercent}%, SoilHealth=${recStd.soilHealthIndexScore}, FailureRisk=${recStd.avgFailureRiskPercent}%`);

// ----------------------------------------------------------------------------
// Test 2: Severe Salinity Field (Reclaimed Desert Land)
// ----------------------------------------------------------------------------
console.log('\nTest 2: High Salinity Soil (salinityRiskLevel: severe)');
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
for (const yr of salineStrategies[0].years) {
  assert(yr.crop.salinityToleranceDsM >= 4.5, `Crop ${yr.crop.id} in severe salinity must be halotolerant (>=4.5 dS/m)`);
}
console.log(`  ✓ High Salinity: Selected halotolerant crops: ${salineStrategies[0].years.map(y => y.crop.nameEn).join(' -> ')}`);

// ----------------------------------------------------------------------------
// Test 3: Subsoil Hardpan Compaction Remediation
// ----------------------------------------------------------------------------
console.log('\nTest 3: Subsoil Compaction / Hardpan Bio-Drilling');
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
const hasDeepRooter = hardpanStrategies[0].years.some(y => y.crop.rootDepthMaxM >= 1.5);
assert(hasDeepRooter, 'Hardpan field rotation must incorporate a deep bio-drilling taproot crop (>=1.5m)');
assert(hardpanStrategies[0].evidenceSummaryAr.includes('طبقة صماء'), 'Evidence summary must explain hardpan bio-drilling');
console.log(`  ✓ Hardpan Remediation: Bio-drill crop verified with root depth: ${hardpanStrategies[0].years.find(y => y.crop.rootDepthMaxM >= 1.5)?.crop.nameEn}`);

// ----------------------------------------------------------------------------
// Test 4: Dynamic Priority Shift (What-If Weight Sensitivity)
// ----------------------------------------------------------------------------
console.log('\nTest 4: Priority Weight Shift (What-If Scenario)');
const profitHeavyPriorities = {
  profitWeight: 0.80,
  waterWeight: 0.10,
  soilHealthWeight: 0.05,
  climateRiskWeight: 0.05,
};

const profitHeavyStrategies = simulateRotationStrategies(standardMemory, profitHeavyPriorities, 30.85, 31.05);
assert(profitHeavyStrategies[0].topsisCloseness > 0, 'Profit-heavy TOPSIS must calculate valid score');
console.log(`  ✓ TOPSIS Sensitivity: Default closeness=${recStd.topsisCloseness} vs Profit-Heavy closeness=${profitHeavyStrategies[0].topsisCloseness}`);

console.log('\n🎉 ALL FIELDSHIFT ENGINE TESTS PASSED SUCCESFULLY!\n');
