# ==============================================================================
# BlinkFarms — Python Scientific Core FastAPI Microservice
# High-Performance Endpoints for NASA Telemetry, Simulation & Validation
# NASA Space Apps Challenge 2026: Field Shift
# ==============================================================================

import os
import sys
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from models import (
    calc_ndvi, calc_savi, calc_actual_eta, calc_esi,
    check_flash_drought_alert, calc_canopy_fever_anomaly,
    calc_prescriptive_irrigation, calc_closed_loop_soil_error,
    calc_pt_jpl_constraints, calc_pt_jpl_fluxes, calc_advection_decoupled_lec,
    simulate_fao56_daily_balance, calc_stewart_yield,
    calc_soil_health_index, solve_dynamic_topsis
)
from historical_validation import run_ameriflux_us_ne1_benchmark, run_regional_arid_benchmarks

app = FastAPI(
    title="BlinkFarms NASA Biophysical Engine API",
    version="2.1.0",
    description="Scientific microservice executing NASA Earth Observation algorithms, PT-JPL fluxes, and FAO-56 simulations"
)

# Enable CORS for Next.js frontend (default port 3001 or 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TelemetryRequest(BaseModel):
    lat: float = 30.850
    lon: float = 31.050
    t_air: float = 33.5
    rh: float = 0.35
    r_net: float = 460.0
    pet: float = 7.5
    theta_root_30m: float = 0.24
    theta_fc: float = 0.34
    theta_wp: float = 0.14
    z_r: float = 1.2
    area_ha: float = 25.0
    u_wind: float = 3.5
    d_edge: float = 80.0
    esi_prior_7d: Optional[float] = None
    gdd_accum: Optional[float] = 850.0
    gdd_maturity: Optional[float] = 1350.0
    simulate_shock: bool = False

class SimulationRequest(BaseModel):
    lat: float = 30.850
    lon: float = 31.050
    priorities: Dict[str, float] = {
        "profitWeight": 0.25,
        "waterWeight": 0.35,
        "soilHealthWeight": 0.25,
        "climateRiskWeight": 0.15
    }
    field_memory: Optional[Dict[str, Any]] = None

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "healthy",
        "engine": "BlinkFarms Python Scientific Core",
        "version": "2.1.0",
        "framework": "FastAPI + NumPy + SciPy",
        "nasa_sensors": ["ECOSTRESS", "SMAP 30m", "HLS (Landsat 8/9 & Sentinel-2)", "NASA POWER", "Sentinel-1 SAR"]
    }

@app.post("/api/v1/telemetry")
def compute_telemetry(req: TelemetryRequest):
    """
    Computes biophysical PT-JPL fluxes, ESI, thermal canopy fever, and prescriptive irrigation depth.
    """
    ndvi = 0.78
    savi = calc_savi(0.68, 0.14)
    fc = float(np.clip(ndvi * 0.90, 0.1, 0.95))

    # PT-JPL constraints
    constraints = calc_pt_jpl_constraints(
        t_air=req.t_air,
        rh=req.rh,
        f_apar=ndvi,
        f_ipar=ndvi * 1.05,
        t_opt=26.0,
        theta_root=req.theta_root_30m,
        theta_fc=req.theta_fc,
        theta_wp=req.theta_wp
    )

    fluxes = calc_pt_jpl_fluxes(r_net=req.r_net, fc=fc, constraints=constraints)
    le_c = fluxes["le_c"]
    
    # Advection decoupling for desert/oasis boundary winds
    le_c_decoupled = calc_advection_decoupled_lec(
        le_c,
        u_wind=req.u_wind,
        grad_tsurface=6.0,
        d_edge=req.d_edge
    )

    _, eta = calc_actual_eta(le_c_decoupled, le_soil=fluxes["le_s"])
    esi = calc_esi(eta, req.pet)

    # Determine flash drought alert from real observation time series or explicit simulation
    if req.simulate_shock:
        # Explicit labeled scenario simulation of sudden flash drought shock
        prior_esi = min(1.0, esi + 0.22)
        is_alert, delta_7d = check_flash_drought_alert(esi, prior_esi, gdd_accum=req.gdd_accum or 850.0, gdd_maturity=req.gdd_maturity or 1350.0)
        alert_status = "simulated_shock_scenario"
    elif req.esi_prior_7d is not None:
        # Verified time series observation comparison
        is_alert, delta_7d = check_flash_drought_alert(esi, req.esi_prior_7d, gdd_accum=req.gdd_accum or 850.0, gdd_maturity=req.gdd_maturity or 1350.0)
        alert_status = "active_observed_degradation" if is_alert else "normal_transpiration"
    else:
        # Single-day observation: strictly report insufficient time series rather than fabricating past data
        is_alert = False
        delta_7d = 0.0
        alert_status = "insufficient_time_series_data"

    depth_mm, vol_m3 = calc_prescriptive_irrigation(req.theta_fc, req.theta_root_30m, req.z_r, req.area_ha)
    
    # Healthy canopy transpires evaporatively to maintain Tc ~ 2.5°C cooler than air
    canopy_temp_c = req.t_air - (2.5 * esi)
    canopy_fever_c = calc_canopy_fever_anomaly(canopy_temp_c, req.t_air, t_baseline_delta=-2.5)

    return {
        "success": True,
        "coordinates": [req.lat, req.lon],
        "metrics": {
            "ndvi": float(round(ndvi, 3)),
            "savi": float(round(savi, 3)),
            "canopy_temp_c": float(round(canopy_temp_c, 1)),
            "canopy_fever_c": float(round(canopy_fever_c, 1)),
            "eta_mm_day": float(round(eta, 2)),
            "pet_mm_day": float(round(req.pet, 2)),
            "esi": float(round(esi, 3)),
            "delta_esi_7d": float(round(delta_7d, 3)),
            "is_flash_drought_alert": is_alert,
            "alert_status": alert_status,
            "prescribed_irrigation_mm": float(round(depth_mm, 1)),
            "prescribed_volume_m3_ha": float(round(vol_m3 / req.area_ha, 0))
        }
    }

@app.post("/api/v1/simulate")
def compute_rotation_simulation(req: SimulationRequest):
    """
    Executes agro-ecological suitability filtering, FAO-56 balance, and dynamic TOPSIS optimization.
    """
    p = req.priorities
    abs_lat = abs(req.lat)
    is_mena_arid = (18.0 <= abs_lat <= 34.0) and (-15.0 <= req.lon <= 55.0)

    weights = np.array([
        p.get("profitWeight", 0.25),
        p.get("waterWeight", 0.35),
        p.get("soilHealthWeight", 0.25),
        p.get("climateRiskWeight", 0.15)
    ])
    weights = weights / np.sum(weights)

    # Extract field memory attributes
    mem = req.field_memory or {}
    carryover = float(mem.get("carryoverWaterFraction", 0.55))
    stress_freq = float(mem.get("stressFrequency36m", 0.15))
    hardpan = bool(mem.get("hardpanDetected", False))
    salinity = str(mem.get("salinityRiskLevel", "normal")).lower()

    # Dynamic biophysical adjustments
    base_climate_risk = min(85.0, max(12.0, 30.0 + stress_freq * 40.0 + (1.0 - carryover) * 20.0))
    monoculture_risk = min(92.0, base_climate_risk + (12.0 if hardpan else 5.0) + (15.0 if salinity != 'normal' else 0.0))
    monoculture_profit = max(900.0, 1860.0 - (250.0 if hardpan else 0.0) - (350.0 if salinity == 'severe' else 0.0))
    monoculture_soil = max(12.0, 26.0 - (8.0 if hardpan else 0.0) - (6.0 if salinity == 'severe' else 0.0))

    if is_mena_arid:
        # Strategy 1: Legume -> Cereal -> Cash/Bio-drill
        b_profit = 2640.0 + (100.0 if carryover > 0.6 else -80.0)
        b_water_saved = 38.0
        b_soil = 88.0 + (6.0 if hardpan else 0.0)
        b_risk = min(30.0, max(5.0, base_climate_risk * 0.28))

        # Strategy 2: Ultra Drought & Salinity
        w_profit = 2250.0 - (100.0 if salinity == 'severe' else 0.0)
        w_water_saved = 48.0
        w_soil = 82.0
        w_risk = min(20.0, max(4.0, base_climate_risk * 0.20))

        matrix = np.array([
            [b_profit, b_water_saved, b_soil, b_risk],
            [w_profit, w_water_saved, w_soil, w_risk],
            [monoculture_profit, 0.0, monoculture_soil, monoculture_risk],
        ])
        is_benefit = [True, True, True, False]
        scores = solve_dynamic_topsis(matrix, weights, is_benefit)

        crop1 = "alfalfa" if hardpan else "clover_berseem"
        crop_salt = "panicum" if salinity != "normal" else "sorghum"

        strategies = [
            {
                "id": "balanced",
                "title_ar": f"الدورة التكيفية المتوازنة ({'برسيم حجازي' if hardpan else 'برسيم بلدي'} ➔ قمح ديورم ➔ عباد شمس/ذرة)",
                "title_en": f"Regenerative Balance ({'Alfalfa' if hardpan else 'Berseem Clover'} ➔ Durum Wheat ➔ Sunflower/Maize)",
                "crops": [crop1, "durum_wheat", "sunflower"],
                "water_saved_percent": float(round(b_water_saved, 1)),
                "nitrogen_added_kg_ha": 95.0 if not hardpan else 140.0,
                "failure_risk_percent": float(round(b_risk, 1)),
                "net_profit_usd_ha": float(round(b_profit, 1)),
                "soil_health_index": float(round(b_soil, 1)),
                "topsis_score": float(round(scores[0], 3))
            },
            {
                "id": "water_saving",
                "title_ar": f"دورة الصمود المائي والملحي ({'بانيكم' if salinity != 'normal' else 'ذرة رفيعة'} ➔ فول بلدي ➔ شعير)",
                "title_en": f"Ultra Drought & Salinity Resilience ({'Panicum' if salinity != 'normal' else 'Sorghum'} ➔ Faba Bean ➔ Barley)",
                "crops": [crop_salt, "faba_bean", "barley"],
                "water_saved_percent": float(round(w_water_saved, 1)),
                "nitrogen_added_kg_ha": 65.0,
                "failure_risk_percent": float(round(w_risk, 1)),
                "net_profit_usd_ha": float(round(w_profit, 1)),
                "soil_health_index": float(round(w_soil, 1)),
                "topsis_score": float(round(scores[1], 3))
            },
            {
                "id": "current",
                "title_ar": "الدورة الأحادية المستمرة (ذرة مستمرة)",
                "title_en": "Continuous Maize Monoculture",
                "crops": ["maize", "maize", "maize"],
                "water_saved_percent": 0.0,
                "nitrogen_added_kg_ha": -375.0,
                "failure_risk_percent": float(round(monoculture_risk, 1)),
                "net_profit_usd_ha": float(round(monoculture_profit, 1)),
                "soil_health_index": float(round(monoculture_soil, 1)),
                "topsis_score": float(round(scores[2], 3))
            }
        ]
    else:
        # Temperate / US Corn Belt Decision Matrix
        matrix = np.array([
            [2520.0, 32.0, 86.0, 11.0],  # Soybean -> Winter Wheat -> Maize
            [2180.0, 44.0, 80.0, 8.0],   # Sorghum -> Chickpea -> Barley
            [1860.0, 0.0,  24.0, 74.0],  # Continuous Maize
        ])
        is_benefit = [True, True, True, False]
        scores = solve_dynamic_topsis(matrix, weights, is_benefit)

        strategies = [
            {
                "id": "balanced",
                "title_ar": "دورة التجديد المتوازنة (صويا ➔ قمح شتوي ➔ ذرة)",
                "title_en": "Regenerative Balance (Soybean ➔ Winter Wheat ➔ Maize)",
                "crops": ["soybean", "winter_wheat", "maize"],
                "water_saved_percent": 32.0,
                "nitrogen_added_kg_ha": 85.0,
                "failure_risk_percent": 11.0,
                "net_profit_usd_ha": 2520.0,
                "soil_health_index": 86.0,
                "topsis_score": float(round(scores[0], 3))
            },
            {
                "id": "water_saving",
                "title_ar": "دورة توفير المياه (ذرة رفيعة ➔ حمص ➔ شعير)",
                "title_en": "Water-Saving Resilience (Sorghum ➔ Chickpea ➔ Barley)",
                "crops": ["sorghum", "chickpea", "barley"],
                "water_saved_percent": 44.0,
                "nitrogen_added_kg_ha": 55.0,
                "failure_risk_percent": 8.0,
                "net_profit_usd_ha": 2180.0,
                "soil_health_index": 80.0,
                "topsis_score": float(round(scores[1], 3))
            },
            {
                "id": "current",
                "title_ar": "الدورة الأحادية المستمرة (ذرة مستمرة)",
                "title_en": "Continuous Maize Monoculture",
                "crops": ["maize", "maize", "maize"],
                "water_saved_percent": 0.0,
                "nitrogen_added_kg_ha": -375.0,
                "failure_risk_percent": 74.0,
                "net_profit_usd_ha": 1860.0,
                "soil_health_index": 24.0,
                "topsis_score": float(round(scores[2], 3))
            }
        ]

    return {
        "success": True,
        "region": "mena_arid" if is_mena_arid else "temperate_global",
        "strategies": strategies
    }

@app.get("/api/v1/benchmark")
def get_ameriflux_benchmark():
    """
    Returns the real-world statistical validation against AmeriFlux US-Ne1.
    """
    res = run_ameriflux_us_ne1_benchmark()
    return {
        "success": True,
        "tower_site": "AmeriFlux US-Ne1 (Mead Irrigated Maize)",
        "drought_year": 2012,
        "results": res
    }

@app.get("/api/v1/regional_benchmarks")
def get_regional_benchmarks():
    """
    Returns biophysical ground-truth benchmarks for Toshka, Nile Delta, and Al-Qassim.
    """
    res = run_regional_arid_benchmarks()
    return {
        "success": True,
        "parcels": res
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api_server:app", host="127.0.0.1", port=8000, reload=False)
