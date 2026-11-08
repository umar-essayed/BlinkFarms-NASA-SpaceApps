# BlinkFarms — AI Agronomist Copilot & Biophysical Grounding Specification
**NASA Space Apps Challenge 2026 — Challenge 7: Field Shift**

---

## 1. System Objective & Non-Negotiable Guardrails

The **BlinkFarms AI Agronomist Copilot** delivers hyper-localized, scientifically grounded agronomic advice directly to farmers and extension workers. Unlike generic large language models that hallucinate imaginary crop protocols or spout academic jargon, the BlinkFarms Copilot is strictly bounded by a typed **Biophysical Evidence Package**.

### Core Guardrails:
1. **Zero Scientific Hallucination**: The Copilot is barred from inventing weather measurements, soil properties, or yield projections. If required parameters are missing from the Evidence Package, the agent must refuse or ask targeted clarification questions ("لا توجد بيانات كافية عن هذا الحقل، هل قمت بتحديد نوع التربة ونظام الري؟").
2. **Strict Provenance Attribution**: Every scientific assertion maps directly to underlying NASA Earth observations (ECOSTRESS thermal infrared, SMAP L-band soil moisture, NASA POWER agroclimatology) or USDA/FAO-56 biophysical modeling.
3. **No Raw Numerical Coordinates**: Farmers never need to decipher decimal latitude/longitude strings. Coordinates are translated into human-readable local place names (e.g., "دلتا النيل - طنطا", "مشروع توشكى الخير").
4. **Local Units First**: Irrigation volumes are communicated primarily in **$\text{م}^3 / \text{فدان}$** ($1\text{ mm} = 4.2\text{ m}^3/\text{feddan}$), with metric and hectare equivalents provided for international extension workers.
5. **Deterministic Offline Fallback**: If external AI cloud APIs are unavailable, the system transparently falls back to an internal deterministic biophysical expert rule solver.

---

## 2. Typed Evidence Packaging Schema

Before every chat completion, the application state constructs an immutable, typed evidence payload:

```typescript
export interface CopilotEvidencePackage {
  // Field Identification
  fieldName: string;
  regionalZone: 'mena_arid' | 'mediterranean' | 'temperate_us';
  areaFeddan: number;

  // Real-Time Biophysical Observation
  observationTimestamp: string;
  provenance: {
    weatherState: 'LIVE' | 'HISTORICAL' | 'ESTIMATED';
    soilMoistureState: 'ESTIMATED' | 'SIMULATED';
    dataSource: string; // e.g. "NASA POWER MERRA-2 + ECOSTRESS"
  };

  // Weather & Thermal Measurements
  airTempC: number;
  relativeHumidityPercent: number;
  canopyTempC: number;
  canopyFeverAnomalyC: number; // Tc - Tbaseline (+0.0 to +8.0°C)
  evaporativeStressIndex: number; // 0.0 to 1.0 (relative ET)

  // Irrigation Prescription
  prescribedDepthMm: number;
  prescribedVolumeM3Feddan: number;
  isShockUrgent: boolean;

  // Soil & Field Memory State
  previousCrop: string;
  soilTexture: 'clay' | 'loam' | 'sandy' | 'sandy_loam';
  irrigationMethod: 'flood' | 'pivot' | 'drip';
  subsoilHardpanDetected: boolean;
  salinityRiskLevel: 'normal' | 'moderate' | 'severe';
  carryoverWaterFraction: number;

  // Candidate Crop Rotation Alternatives (from FieldShift TOPSIS)
  recommendedRotation: {
    crops: string[];
    waterSavedPercent: number;
    soilHealthScore: number;
    topsisCloseness: number;
  };
}
```

---

## 3. Grounding & Translation Protocol

```
   [ Raw Satellite Observations ]        [ Farmer Field Wizard ]
   (ECOSTRESS Tc, SMAP, NASA POWER)      (Crop history, Soil, Irrigation)
                  │                                     │
                  └─────────────────┬───────────────────┘
                                    ▼
                    [ Typed Biophysical Evidence Package ]
                                    │
                                    ▼
                    [ System Instruction Injector ]
                      • Bounded Context Only
                      • Ban Jargon (NDVI, ESI, TOPSIS)
                      • Enforce Units (m³/feddan)
                      • Strict Vernacular Mapping
                                    │
                                    ▼
                    [ Multi-Model Cascade Engine ]
                      1. Gemini 2.5 Flash
                      2. Gemini 1.5 Flash
                      3. Gemini 1.5 Pro
                      4. Deterministic Local Solver
                                    │
                                    ▼
                    [ Verified Farmer-Centric Output ]
```

---

## 4. Egyptian Vernacular Translation Table

| Raw Data / Concept | AI Copilot Arabic Output | AI Copilot English Output |
| :--- | :--- | :--- |
| $\Delta T_c > +2.5^\circ\text{C}$ (Vegetative fever) | "الزرع حرارته دافية ومكتوم، وعروقه عطشانة.. لو مارويتش النهاردة، هتتفاجئ بإنه هينشف ويصفر فجأة بعد أسبوعين." | "The crop foliage is running hot with pores clamped shut. Without immediate watering today, severe visible wilting will occur in 14 days." |
| $\text{ESI} > 0.70$ (Normal transpiration) | "الحالة ممتازة والري منتظم، والزرع بيتنفس وبيبرد نفسه بصورة طبيعية، فقط استمر على الري الدوري المعتاد." | "Your crop is breathing freely with normal transpirational cooling. Continue routine scheduled irrigation." |
| $\xi_{\text{soil}} < 0.70$ (Hardpan compaction) | "التحليل كشف انضغاط وكتمة في باطن الأرض على عمق 45 سم؛ جذور البرسيم الحجازي أو عباد الشمس هتخترقها وتفكك الأرض بيولوجياً." | "Orbital diagnostics reveal a compacted subsoil hardpan at 45 cm depth; deep-taproot crops like alfalfa or sunflower will bio-drill and restore drainage." |
| $I_{\text{req}} = 18\text{ mm}$ | "كمية الري المطلوبة: حوالي 76 متر مكعب لكل فدان، ويفضل مع طراوة الصباح الباكر أو بعد العصر." | "Recommended irrigation depth: 18 mm (~76 m³ per feddan), ideally applied during cool morning or late afternoon hours." |

---

## 5. Offline Fallback Matrix

When cloud AI services are unreachable or credentials are absent:
1. **Context Extraction**: Parses the latest `CopilotEvidencePackage` from local browser storage or FastAPI microservice.
2. **Rule Matrix Evaluation**:
   - Condition 1: If `isShockUrgent === true` $\to$ Emits urgent quenching prescription with exact $\text{m}^3/\text{feddan}$ and 14-day browning explanation.
   - Condition 2: If `subsoilHardpanDetected === true` $\to$ Emits bio-drilling advice with deep-taproot rotation recommendations.
   - Condition 3: If normal maintenance $\to$ Reassures farmer of steady transpiration and provides regular scheduled watering window.
