# NASA Earth Observation Data Catalog & Provenance Specification
**Author:** Agent B — NASA Earth Observation & Data Provenance Specialist  
**Project:** BlinkFarms / FieldShift / VeloceRoot  
**Date:** November 2026 (NASA Space Apps Challenge 2026)

---

## 1. Principles of Scientific Data Provenance in BlinkFarms

To comply with scientific integrity and competition standards:
1. **Never conflate scale:** Coarse 9km or 0.5° satellite datasets must never be presented as direct, sensor-grade measurements of a single smallholder farm or soil layer without explicitly explaining downscaling or regional proxy assumptions.
2. **Explicit Data States:** Every scalar and time-series displayed in BlinkFarms carries a mandatory `data_state`:
   - `LIVE`: Directly retrieved from a verified NASA satellite or meteorological station API for the current time window.
   - `HISTORICAL`: Reanalysis or archived satellite observation for a confirmed past time period.
   - `ESTIMATED`: Derived via validated biophysical models (e.g. Penman-Monteith, PT-JPL) from observed weather inputs.
   - `SIMULATED`: Generated scenarios for educational, What-If, or demo purposes (explicitly labeled).
   - `USER_INPUT`: Data entered or confirmed by the farmer (e.g., crop type, soil texture, irrigation method).
3. **No Silently Fabricated Data:** If a satellite observation is unavailable due to orbital pass timing or cloud obscuration, the system exposes the data gap, displays the timestamp of the last valid observation, and provides an estimated proxy with declared uncertainty.

---

## 2. NASA Data Products Catalog

### Product 1: NASA POWER (Prediction Of Worldwide Energy Resources) — Agroclimatology
* **Data Source:** NASA Langley Research Center (LaRC)
* **Access Method:** Open REST API (No API key required)
* **Endpoint:** `https://power.larc.nasa.gov/api/temporal/daily/point`
* **Underlying Model / Sensors:** NASA GMAO MERRA-2 assimilation & GEOS-FP solar radiance
* **Variables Retrieved:**
  - `T2M`: Temperature at 2 Meters (°C)
  - `T2M_MAX` / `T2M_MIN`: Maximum / Minimum Air Temperature (°C)
  - `RH2M`: Relative Humidity at 2 Meters (%)
  - `ALLSKY_SFC_SW_DWN`: All-Sky Insolation Incident on a Horizontal Surface ($MJ/m^2/day$ or $W/m^2$)
  - `WS2M`: Wind Speed at 2 Meters ($m/s$)
  - `PRECTOTCORR`: Precipitation Corrected ($mm/day$)
* **Spatial Resolution:** $0.5^\circ \times 0.625^\circ$ (~50km regional grid)
* **Temporal Resolution:** Daily (latency: ~2-3 days for verified final, ~1 day for near-real-time GEOS-FP)
* **Appropriate Use in BlinkFarms:** Primary driver for daily reference evapotranspiration ($ET_0$), Vapor Pressure Deficit ($VPD$), and net solar radiation ($R_n$).
* **Limitations:** Spatial resolution represents regional atmospheric conditions, not microclimate variations inside a protected greenhouse or deep canyon.

---

### Product 2: NASA ECOSTRESS (ECOsystem Spaceborne Thermal Radiometer Experiment on Space Station)
* **Data Source:** NASA JPL / LP DAAC (Mounted on ISS)
* **Products:**
  - `ECO2LSTE.001`: Land Surface Temperature & Emissivity (TIR bands 8-12 $\mu m$)
  - `ECO3ETPTJPL.001`: Evapotranspiration PT-JPL
  - `ECO4ESIPTJPL.001`: Evaporative Stress Index (PT-JPL)
* **Spatial Resolution:** $70m \times 70m$
* **Temporal Resolution:** Precessing orbit on the ISS; revisits every 3 to 5 days at varying times of day (diurnal thermal sampling).
* **Appropriate Use in BlinkFarms:** Detecting canopy thermal fever ($\Delta T_{canopy} = T_{canopy} - T_{air}$) at parcel scale to detect stomatal pore closure before optical chlorophyll senescence.
* **Limitations:** Not a continuous daily stream; observations depend on ISS orbital path and cloud-free conditions. On days between passes, BlinkFarms uses energy balance modeling driven by daily NASA POWER weather.

---

### Product 3: NASA SMAP (Soil Moisture Active Passive)
* **Data Source:** NASA Goddard / NSIDC
* **Products:**
  - `SPL4SMGP`: SMAP L4 Global 3-hourly 9km Surface and Root-Zone Soil Moisture
* **Variables:**
  - `sm_surface`: 0-5cm volumetric soil moisture ($m^3/m^3$)
  - `sm_rootzone`: 0-100cm volumetric soil moisture ($m^3/m^3$)
* **Spatial Resolution:** 9 km (assimilated with NASA Catchment Land Surface Model)
* **Temporal Resolution:** 3-hourly / daily
* **Appropriate Use in BlinkFarms:** Regional deep moisture trend monitoring and macro-hydrological validation.
* **Limitations:** 9km pixel covers hundreds of smallholder farms. It provides regional moisture dynamics, but cannot resolve field-specific subsoil compaction (Hardpan) or localized irrigation pulses without farmer confirmation.

---

## 3. Provenance Data Schema (TypeScript Interface)

```typescript
export type DataState = 'LIVE' | 'HISTORICAL' | 'ESTIMATED' | 'SIMULATED' | 'USER_INPUT';

export interface ProvenanceMetadata {
  variable: string;
  value: number | string | boolean;
  unit: string;
  data_state: DataState;
  source_name: string;        // e.g. "NASA POWER Agroclimatology"
  source_product: string;     // e.g. "MERRA-2 GEOS-FP"
  source_url?: string;
  observation_time: string;   // ISO 8601 or date string
  retrieved_at: string;
  spatial_resolution: string; // e.g. "0.5° (~50km)" or "70m"
  temporal_resolution: string;// e.g. "Daily" or "3-5 day revisit"
  quality_status: 'high' | 'provisional' | 'interpolated' | 'synthetic';
  limitations: string;
}
```
