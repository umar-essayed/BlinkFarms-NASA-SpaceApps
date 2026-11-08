# BlinkFarms Repository Audit & Integration Architecture Report
**Author:** Agent A — Repository Auditor & Integration Architect  
**Project:** BlinkFarms / FieldShift / VeloceRoot  
**Date:** November 2026 (NASA Space Apps Challenge 2026, Challenge 7)

---

## 1. Executive Codebase Inventory & Current State

A thorough line-by-line inspection of `d:\nasa-sapceapp\blinkfarms` was conducted across all subsystems:

### Directory & Stack Structure:
* **Frontend Framework:** Next.js 14.2.15 (App Router), TypeScript, Tailwind CSS.
* **Backend Scientific Core:** Python 3.10+ (FastAPI, NumPy, SciPy) located in `engine_py/`.
* **State Management & Routing:**
  - `/` (Main Dashboard with Satellite Radar Map & Crop Rotation Engine)
  - `/chat` (Dedicated Fullscreen AI Farm Advisor)
  - `/login` (Farmer Authentication Gateway)
  - `/onboarding` (Visual Feature Introduction)
  - `/api/chat` (Gemini API bridge)
  - `/api/telemetry` (Telemetry orchestrator)
  - `/api/simulate` (Shock scenario endpoint)
* **Scientific Computation Modules:**
  - `engine_py/models.py` (Vectorized Python implementation of biophysical equations)
  - `engine_py/api_server.py` (FastAPI microservice endpoints)
  - `src/lib/veloceRootEngine.ts` (Client-side biophysical mirror)
  - `src/lib/fieldShiftEngine.ts` (3-Year Crop Rotation Engine)
  - `src/lib/cropDatabase.ts` (Agronomic crop parameters)

---

## 2. Comprehensive Findings & Severity Matrix (Section 3 Verification)

| Item | Component & File Location | Documented Claim vs. Real Code Behavior | Provenance / Data Truth | Status | Severity | Required Remediations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **3.1** | `engine_py/api_server.py:112` | Claimed live flash drought alert detection based on consecutive degradation. In code: `is_alert, delta_7d = check_flash_drought_alert(esi, esi + 0.18, ...)`. The prior ESI is hardcoded as `esi + 0.18`! | Synthetic / Fabricated prior observation | **Defective** | **CRITICAL** | Remove fabricated offset. Require timestamped observation series. If history is missing, return `insufficient_data` or explicitly label as `SIMULATED`. |
| **3.2** | `src/lib/veloceRootEngine.ts:193-270` | `generateFieldTelemetry()` claims to output real-time NASA physical telemetry. In code: uses `Math.sin(i * 0.3)` and `Math.cos(i * 0.2)` on fixed day-of-year loop with `Math.random()`. | Synthetic formula presented as live observation | **Demo-Only** | **HIGH** | Gate behind explicit `data_state: "SIMULATED"` mode. Integrate real NASA POWER daily API for actual temperature, solar irradiance, RH, and precipitation. |
| **3.3** | `src/lib/fieldShiftEngine.ts:120-250` | Rotation engine claims to dynamically compute candidate rotations via TOPSIS. In code: `failureRiskPercent: 68`, `netIncomeUsdHa: 730`, and `yieldRatioPredicted: 0.82` are hardcoded constants inside static candidate objects. | Hardcoded constants inside templates | **Demo-Only** | **HIGH** | Build a true dynamic succession generator that evaluates agronomic constraints, water requirements, and soil effects dynamically, with user priorities genuinely altering candidate scores. |
| **3.4** | `src/lib/veloceRootEngine.ts:310-370` | `deriveFieldMemoryFromCoords()` claims to read a 10-year NASA historical time series. In code: coarse bounding boxes return static values (`carryoverWaterFraction: 0.38`, `hardpanDetected: true`). | Regional proxy bucket presented as 10-yr field memory | **Overclaimed** | **HIGH** | Reclassify as regional soil/climate baseline proxy with explicit spatial resolution (~50-100km) and uncertainty. Never diagnose hardpan or salinity without explicit farmer entry or in-situ test. |
| **3.5** | `engine_py/models.py:260` vs. Documentation Eq 12 | In `models.py:260`: `ESI = et_a / pet` (1.0 = healthy). In `BLINKFARMS_SYSTEM_DOCUMENTATION.md` Eq 12: `ESI = 1 - ET_a / PET` (0.0 = healthy). | Mathematical sign & definition conflict | **Inconsistent** | **HIGH** | Standardize terminology: define Relative Evapotranspiration / Evaporative Fraction $r_{ET} = ET_a / PET$ and Water Stress Index $WSI = 1 - r_{ET}$. Align all code, UI gauges, and documentation. |
| **3.6** | Multi-file claims regarding NASA products | Claims imply continuous daily field-level thermal monitoring from ECOSTRESS (70m) and direct subsoil observation from SMAP. | Misrepresented satellite capability | **Overclaimed** | **MEDIUM** | State satellite orbit realities: ECOSTRESS has a 3-5 day precessing revisit window on ISS; SMAP L4 is 9km spatial resolution. Display "Last Valid Observation" timestamp and explicit provenance. |
| **3.7** | `engine_py/historical_validation.py` | Cites $R^2 = 0.9966$, RMSE = 0.241 mm/day on AmeriFlux US-Ne1. In code: generates synthetic data with `np.sin` and `np.random.uniform` and fits model to synthetic series. | Simulated benchmark presented as real validation | **Unproven** | **HIGH** | Re-label `historical_validation.py` as a synthetic benchmark simulation demonstrating methodology. Remove unverified claims of "100% crop rescue" and "14-day mathematically proven advantage" unless bounded as theoretical targets. |

---

## 3. Architecture & Integration Boundaries

To prevent cross-module collisions and ensure clean code boundaries, we establish 4 foundational layers:

```
[Layer 1: Provenance & Data Contracts] (src/lib/provenanceTypes.ts)
  └── Typed metadata: data_state, observation_time, source_name, resolution, limitations

[Layer 2: Real Data Adapters & Scientific Engines]
  ├── NASA POWER API Adapter (src/lib/nasaPowerAdapter.ts) - Real daily meteorology
  ├── Scientific Engine (src/lib/veloceRootEngine.ts & engine_py/models.py)
  └── Dynamic Crop Succession Engine (src/lib/fieldShiftEngine.ts)

[Layer 3: UI Workflow & Farmer Experience]
  ├── Dashboard (src/app/page.tsx) - Field Status, What-If Simulator, Provenance HUD
  ├── AI Copilot (src/app/chat/page.tsx & src/app/api/chat/route.ts)
  └── Onboarding & Auth (src/app/onboarding/page.tsx, src/app/login/page.tsx)

[Layer 4: Verification & Automated QA]
  ├── Python Test Suite (engine_py/tests_all_equations.py)
  └── Next.js Build & TypeScript Validation (npm run build)
```

---

## 4. Recommended Implementation Sequence

1. **Phase 1 (Agent B):** Implement `provenanceTypes.ts` and `nasaPowerAdapter.ts` to fetch and cache real daily observations from NASA POWER AG API.
2. **Phase 2 (Agent C):** Reconcile ESI/WSI definitions in `models.py`, `veloceRootEngine.ts`, and documentation; remove fabricated alert offsets; enforce honest proxy labeling for field memory.
3. **Phase 3 (Agent D):** Refactor `fieldShiftEngine.ts` into a true combinatorial crop-rotation generator that evaluates real season windows, water budgets, and TOPSIS weights dynamically.
4. **Phase 4 (Agent E):** Upgrade the UI with provenance indicators (`LIVE`, `HISTORICAL`, `ESTIMATED`, `SIMULATED`, `USER_INPUT`), interactive What-If scenario comparisons, and honest data gap displays.
5. **Phase 5 (Agent F):** Ground the Gemini AI Advisor strictly in typed field evidence, refusing to hallucinate sensor values or definitive agronomic outcomes.
6. **Phase 6 (Agent G):** Run independent regression and verification tests, ensuring clean builds, type safety, and honest documentation.
