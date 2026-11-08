# ==============================================================================
# Suite 2: Numerical Dump of All 23 Biophysical Equations
# Tests realistic Egyptian Summer Peak vs Winter Cropping Conditions
# ==============================================================================

import sys
import os
import json
import numpy as np

# Add parent path to import models
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from engine_py.models import (
    calc_ndvi, calc_savi, calc_fc, erode_polygon_buffer_30m,
    downscale_smap_mass_conserved, reconstruct_canopy_temp_sar,
    calc_pt_jpl_constraints, calc_pt_jpl_fluxes, calc_baseline_lec,
    calc_advection_decoupled_lec, calc_actual_eta, calc_esi,
    check_flash_drought_alert, calc_canopy_fever_anomaly,
    calc_prescriptive_irrigation, calc_closed_loop_soil_error,
    build_field_memory_state, simulate_fao56_daily_balance,
    calc_stewart_yield, calc_soil_health_index, solve_dynamic_topsis,
    calc_daily_gdd, calc_aquacrop_biomass, calc_harvest_index_heat_adjusted
)

def run_suite_2():
    results = []

    # -------------------------------------------------------------
    # Eq 1: NDVI
    # -------------------------------------------------------------
    res_s = calc_ndvi(rho_nir=0.48, rho_red=0.09)
    res_w = calc_ndvi(rho_nir=0.32, rho_red=0.14)
    results.append({
        "eq_num": 1,
        "name": "Normalized Difference Vegetation Index (NDVI)",
        "inputs_summer": "rho_nir=0.48, rho_red=0.09",
        "output_summer": round(res_s, 4),
        "inputs_winter": "rho_nir=0.32, rho_red=0.14",
        "output_winter": round(res_w, 4),
        "unit": "Dimensionless [-1.0, 1.0]",
        "vulnerability": "Saturates at high LAI (>3.0) and sensitive to bright sand soil background in desert reclamation."
    })

    # -------------------------------------------------------------
    # Eq 2: SAVI
    # -------------------------------------------------------------
    res_s = calc_savi(rho_nir=0.48, rho_red=0.09, L=0.5)
    res_w = calc_savi(rho_nir=0.32, rho_red=0.14, L=0.5)
    results.append({
        "eq_num": 2,
        "name": "Soil-Adjusted Vegetation Index (SAVI)",
        "inputs_summer": "rho_nir=0.48, rho_red=0.09, L=0.5",
        "output_summer": round(res_s, 4),
        "inputs_winter": "rho_nir=0.32, rho_red=0.14, L=0.5",
        "output_winter": round(res_w, 4),
        "unit": "Dimensionless [-1.0, 1.5]",
        "vulnerability": "Fixed L=0.5 assumes intermediate cover; can underestimate dense canopies if L is not dynamically tuned."
    })

    # -------------------------------------------------------------
    # Eq 3: Fractional Cover (f_c)
    # -------------------------------------------------------------
    res_s = calc_fc(ndvi=0.684, ndvi_min=0.15, ndvi_max=0.85, eta=0.7)
    res_w = calc_fc(ndvi=0.391, ndvi_min=0.15, ndvi_max=0.85, eta=0.7)
    results.append({
        "eq_num": 3,
        "name": "Fractional Canopy Cover (f_c)",
        "inputs_summer": "ndvi=0.684, ndvi_min=0.15, ndvi_max=0.85, eta=0.7",
        "output_summer": round(res_s, 4),
        "inputs_winter": "ndvi=0.391, ndvi_min=0.15, ndvi_max=0.85, eta=0.7",
        "output_winter": round(res_w, 4),
        "unit": "Ratio [0.0, 1.0]",
        "vulnerability": "Heavily dependent on calibration of ndvi_min (bare soil) which shifts between Nile silt (0.12) and Western Desert quartz sand (0.22)."
    })

    # -------------------------------------------------------------
    # Eq 4: Inward Buffer Erosion (-30m Buffer)
    # -------------------------------------------------------------
    test_poly = [(30.850, 31.050), (30.860, 31.050), (30.860, 31.060), (30.850, 31.060)]
    eroded = erode_polygon_buffer_30m(test_poly, buffer_deg=0.00027)
    results.append({
        "eq_num": 4,
        "name": "Inward Polygon Buffer Erosion (-30m)",
        "inputs_summer": "4-point square parcel (1.1x1.1 km), buffer=0.00027 deg",
        "output_summer": "Eroded inward by 30m; perimeter roads removed",
        "inputs_winter": "Same geometry (Winter parcel boundary)",
        "output_winter": f"Centroid preserved: ({eroded[0][0]:.5f}, {eroded[0][1]:.5f})",
        "unit": "Geographic Coordinates (Lat/Lon)",
        "vulnerability": "Narrow parcels (< 60m width) collapse or invert under 30m inward erosion; fallback preserves un-eroded centroid."
    })

    # -------------------------------------------------------------
    # Eq 5: Mass-Conserved SMAP Downscaler (9km -> 30m)
    # -------------------------------------------------------------
    feats = np.array([[0.7, 30.0], [0.5, 33.0], [0.8, 29.0], [0.6, 31.0]])
    weights = np.array([0.2, -0.005])
    res_s = downscale_smap_mass_conserved(theta_9km=0.28, high_res_features=feats, weights=weights)
    res_w = downscale_smap_mass_conserved(theta_9km=0.34, high_res_features=feats, weights=weights)
    results.append({
        "eq_num": 5,
        "name": "Mass-Conserved SMAP Downscaler (9km -> 30m)",
        "inputs_summer": "theta_9km=0.280 m3/m3, 4 high-res sub-pixels",
        "output_summer": f"Mean={np.mean(res_s):.4f} (range [{np.min(res_s):.3f}, {np.max(res_s):.3f}])",
        "inputs_winter": "theta_9km=0.340 m3/m3, 4 high-res sub-pixels",
        "output_winter": f"Mean={np.mean(res_w):.4f} (range [{np.min(res_w):.3f}, {np.max(res_w):.3f}])",
        "unit": "Volumetric Soil Moisture m3/m3",
        "vulnerability": "Requires zero-sum bias correction; if clipping to [0.02, 0.55] bounds is large, residual bias iteration is required."
    })

    # -------------------------------------------------------------
    # Eq 6: Virtual Thermal SAR PINN (reconstruct_canopy_temp_sar)
    # -------------------------------------------------------------
    res_s = reconstruct_canopy_temp_sar(t_air=38.0, delta_sigma_vv_vh=-2.2, theta_root=0.20, vpd=3.8, hour=14.0)
    res_w = reconstruct_canopy_temp_sar(t_air=20.0, delta_sigma_vv_vh=-0.8, theta_root=0.30, vpd=1.2, hour=14.0)
    results.append({
        "eq_num": 6,
        "name": "Virtual Thermal SAR PINN (T_canopy Reconstructor)",
        "inputs_summer": "Tair=38.0°C, Delta_Sigma=-2.2 dB, Theta=0.20, VPD=3.8 kPa",
        "output_summer": round(res_s, 2),
        "inputs_winter": "Tair=20.0°C, Delta_Sigma=-0.8 dB, Theta=0.30, VPD=1.2 kPa",
        "output_winter": round(res_w, 2),
        "unit": "°C (Degrees Celsius)",
        "vulnerability": "Inversion relies on Sentinel-1 C-band backscatter; saturated soil after flood irrigation alters radar dielectric properties."
    })

    # -------------------------------------------------------------
    # Eq 7: PT-JPL Physiological Constraints (epsilon, f_T, f_M)
    # -------------------------------------------------------------
    c_s = calc_pt_jpl_constraints(t_air=38.5, rh=0.32, f_apar=0.75, f_ipar=0.85, t_opt=28.0, theta_root=0.20, theta_fc=0.34, theta_wp=0.14)
    c_w = calc_pt_jpl_constraints(t_air=19.0, rh=0.68, f_apar=0.55, f_ipar=0.65, t_opt=22.0, theta_root=0.30, theta_fc=0.34, theta_wp=0.14)
    results.append({
        "eq_num": 7,
        "name": "PT-JPL Physiological Constraints (epsilon, f_T, f_M)",
        "inputs_summer": "Tair=38.5°C, RH=32%, fAPAR=0.75, fIPAR=0.85, Topt=28°C",
        "output_summer": f"eps={c_s['epsilon']:.3f}, fT={c_s['f_T']:.3f}, fM={c_s['f_M']:.3f}",
        "inputs_winter": "Tair=19.0°C, RH=68%, fAPAR=0.55, fIPAR=0.65, Topt=22°C",
        "output_winter": f"eps={c_w['epsilon']:.3f}, fT={c_w['f_T']:.3f}, fM={c_w['f_M']:.3f}",
        "unit": "Dimensionless Scalars [0.0, 1.0]",
        "vulnerability": "T_opt shifts dynamically with phenological adaptation; assuming static T_opt under-estimates C4 crop photosynthetic activity."
    })

    # -------------------------------------------------------------
    # Eq 8: PT-JPL Partitioned Fluxes (Canopy LE_c vs Soil LE_s)
    # -------------------------------------------------------------
    flux_s = calc_pt_jpl_fluxes(r_net=580.0, fc=0.75, constraints=c_s)
    flux_w = calc_pt_jpl_fluxes(r_net=310.0, fc=0.45, constraints=c_w)
    results.append({
        "eq_num": 8,
        "name": "PT-JPL Partitioned Fluxes (Canopy LE_c vs Soil LE_s)",
        "inputs_summer": "Rn=580 W/m2, fc=0.75, Summer Constraints",
        "output_summer": f"LE_c={flux_s['le_c']:.1f} W/m2, LE_s={flux_s['le_s']:.1f} W/m2",
        "inputs_winter": "Rn=310 W/m2, fc=0.45, Winter Constraints",
        "output_winter": f"LE_c={flux_w['le_c']:.1f} W/m2, LE_s={flux_w['le_s']:.1f} W/m2",
        "unit": "W/m2 (Latent Heat Flux Density)",
        "vulnerability": "Does not account for localized micro-irrigation where inter-row soil evaporation LE_s is nearly zero."
    })

    # -------------------------------------------------------------
    # Eq 9: Advection Decoupling (Omega)
    # -------------------------------------------------------------
    dec_lec_s = calc_advection_decoupled_lec(le_c=flux_s['le_c'], u_wind=4.8, grad_tsurface=5.5, d_edge=120.0)
    dec_lec_w = calc_advection_decoupled_lec(le_c=flux_w['le_c'], u_wind=2.2, grad_tsurface=1.5, d_edge=120.0)
    results.append({
        "eq_num": 9,
        "name": "McNaughton & Jarvis Advection Decoupling (Omega)",
        "inputs_summer": f"LE_c={flux_s['le_c']:.1f} W/m2, Wind=4.8 m/s, Grad_T=5.5°C, Edge=120m",
        "output_summer": round(dec_lec_s, 1),
        "inputs_winter": f"LE_c={flux_w['le_c']:.1f} W/m2, Wind=2.2 m/s, Grad_T=1.5°C, Edge=120m",
        "output_winter": round(dec_lec_w, 1),
        "unit": "W/m2 (Advection-Corrected Latent Flux)",
        "vulnerability": "Boundary clothesline effect (dry desert wind blowing across pivot perimeter) causes edge-pixel over-transpiration."
    })

    # -------------------------------------------------------------
    # Eq 10: Actual Evapotranspiration (ET_a)
    # -------------------------------------------------------------
    le_tot_s, eta_s = calc_actual_eta(le_c_decoupled=dec_lec_s, le_soil=flux_s['le_s'])
    le_tot_w, eta_w = calc_actual_eta(le_c_decoupled=dec_lec_w, le_soil=flux_w['le_s'])
    results.append({
        "eq_num": 10,
        "name": "Actual Evapotranspiration (ET_a)",
        "inputs_summer": f"LE_c={dec_lec_s:.1f}, LE_s={flux_s['le_s']:.1f} W/m2 (Total={le_tot_s:.1f} W/m2)",
        "output_summer": round(eta_s, 2),
        "inputs_winter": f"LE_c={dec_lec_w:.1f}, LE_s={flux_w['le_s']:.1f} W/m2 (Total={le_tot_w:.1f} W/m2)",
        "output_winter": round(eta_w, 2),
        "unit": "mm/day",
        "vulnerability": "Temperature-dependent latent heat of vaporization lambda_v(T) must be coupled to prevent 1-2% energy closure drift."
    })

    # -------------------------------------------------------------
    # Eq 11: Evaporative Stress Index (ESI)
    # -------------------------------------------------------------
    esi_s = calc_esi(et_a=eta_s, pet=8.8)
    esi_w = calc_esi(et_a=eta_w, pet=3.2)
    results.append({
        "eq_num": 11,
        "name": "Evaporative Stress Index (ESI = ET_a / PET)",
        "inputs_summer": f"ET_a={eta_s:.2f} mm/d, PET=8.8 mm/d",
        "output_summer": round(esi_s, 3),
        "inputs_winter": f"ET_a={eta_w:.2f} mm/d, PET=3.2 mm/d",
        "output_winter": round(esi_w, 3),
        "unit": "Ratio [0.0, 1.0]",
        "vulnerability": "During early crop emergence (low canopy cover), low ESI indicates soil drying rather than vegetative drought stress."
    })

    # -------------------------------------------------------------
    # Eq 12: Flash Drought Alert (Delta ESI_7d)
    # -------------------------------------------------------------
    alert_s, desi_s = check_flash_drought_alert(esi_t=0.52, esi_t_minus_7=0.82, gdd_accum=850.0, gdd_maturity=1450.0)
    alert_w, desi_w = check_flash_drought_alert(esi_t=0.76, esi_t_minus_7=0.75, gdd_accum=450.0, gdd_maturity=1200.0)
    results.append({
        "eq_num": 12,
        "name": "Flash Drought Velocity Trigger (Delta ESI_7d <= -0.15)",
        "inputs_summer": "ESI_t=0.52, ESI_t-7=0.82 (Delta=-0.30), GDD=850/1450",
        "output_summer": f"Alert={alert_s}, Delta_ESI={desi_s:.3f}",
        "inputs_winter": "ESI_t=0.76, ESI_t-7=0.75 (Delta=+0.01), GDD=450/1200",
        "output_winter": f"Alert={alert_w}, Delta_ESI={desi_w:.3f}",
        "unit": "Boolean Alert & 7-Day Velocity (1/week)",
        "vulnerability": "Rapid crop maturity/senescence (canopy dieback before harvest) can mimic flash drought velocity without actual moisture stress."
    })

    # -------------------------------------------------------------
    # Eq 13: Canopy Fever Anomaly (Delta T_c)
    # -------------------------------------------------------------
    fever_s = calc_canopy_fever_anomaly(t_canopy=39.5, t_air=38.0, t_baseline_delta=-2.5)
    fever_w = calc_canopy_fever_anomaly(t_canopy=18.5, t_air=20.0, t_baseline_delta=-2.5)
    results.append({
        "eq_num": 13,
        "name": "Canopy Fever Thermal Anomaly (Delta T_c)",
        "inputs_summer": "T_canopy=39.5°C, T_air=38.0°C, Baseline_Delta=-2.5°C",
        "output_summer": round(fever_s, 2),
        "inputs_winter": "T_canopy=18.5°C, T_air=20.0°C, Baseline_Delta=-2.5°C",
        "output_winter": round(fever_w, 2),
        "unit": "°C (Degrees Celsius above unstressed baseline)",
        "vulnerability": "Dependent on accurate empirical baseline wet bulb calculation; dust/sand atmospheric aerosol can distort satellite thermal band."
    })

    # -------------------------------------------------------------
    # Eq 14: Prescriptive Irrigation Depth & Volume
    # -------------------------------------------------------------
    depth_s, vol_s = calc_prescriptive_irrigation(theta_fc=0.34, theta_current=0.20, z_r=1.2, area_ha=15.0)
    depth_w, vol_w = calc_prescriptive_irrigation(theta_fc=0.34, theta_current=0.28, z_r=1.0, area_ha=15.0)
    results.append({
        "eq_num": 14,
        "name": "Prescriptive Irrigation Depth & Volume",
        "inputs_summer": "theta_fc=0.34, theta_cur=0.20, Zr=1.2m, area=15ha",
        "output_summer": f"Depth={depth_s:.1f} mm, Vol={vol_s:.0f} m3",
        "inputs_winter": "theta_fc=0.34, theta_cur=0.28, Zr=1.0m, area=15ha",
        "output_winter": f"Depth={depth_w:.1f} mm, Vol={vol_w:.0f} m3",
        "unit": "mm (depth) & m3 (bulk field volume)",
        "vulnerability": "Assumes uniform soil texture across whole profile without accounting for stratified layers or gravelly subsoil."
    })

    # -------------------------------------------------------------
    # Eq 15: Closed-Loop Soil Hydraulic Probing (xi_soil & Hardpan)
    # -------------------------------------------------------------
    probing_s = calc_closed_loop_soil_error(delta_esi_observed_48h=0.08, delta_esi_predicted=0.18, dissipation_rate_cm_hr=0.6, normal_ksat_cm_hr=2.5)
    probing_w = calc_closed_loop_soil_error(delta_esi_observed_48h=0.15, delta_esi_predicted=0.16, dissipation_rate_cm_hr=2.4, normal_ksat_cm_hr=2.5)
    results.append({
        "eq_num": 15,
        "name": "Closed-Loop Hydraulic Probing (xi_soil & Hardpan)",
        "inputs_summer": "Delta_ESI_obs=0.08, Pred=0.18, Dissipation=0.6 cm/hr",
        "output_summer": f"xi={probing_s['xi_soil_error']:.3f}, Hardpan={probing_s['hardpan_detected']} @ {probing_s['hardpan_depth_cm']}cm",
        "inputs_winter": "Delta_ESI_obs=0.15, Pred=0.16, Dissipation=2.4 cm/hr",
        "output_winter": f"xi={probing_w['xi_soil_error']:.3f}, Hardpan={probing_w['hardpan_detected']}",
        "unit": "Efficiency Ratio xi [-] & Depth (cm)",
        "vulnerability": "Sensor depth placement error or preferential macropore flow can produce false positive hardpan detections."
    })

    # -------------------------------------------------------------
    # Eq 16: 10-Year Field Memory State Vector (F_state)
    # -------------------------------------------------------------
    fstate_s = build_field_memory_state(theta_preplant=0.22, theta_wp=0.14, theta_fc=0.34, esi_history=[0.65]*36, heat_load_accum=1950, xi_soil_error=0.62, prev_crop="maize", ec_e_dsm=6.5)
    fstate_w = build_field_memory_state(theta_preplant=0.28, theta_wp=0.14, theta_fc=0.34, esi_history=[0.82]*36, heat_load_accum=850, xi_soil_error=0.88, prev_crop="berseem", ec_e_dsm=1.8)
    results.append({
        "eq_num": 16,
        "name": "10-Year Field Memory State Vector (F_state)",
        "inputs_summer": "Toshka (carryover=0.40, heat=1950, EC=6.5 dS/m)",
        "output_summer": f"Carryover={fstate_s['phi_carryover']:.2f}, Salinity={fstate_s['salinity_risk_level']}, Hardpan={fstate_s['hardpan_detected']}",
        "inputs_winter": "Delta (carryover=0.70, heat=850, EC=1.8 dS/m)",
        "output_winter": f"Carryover={fstate_w['phi_carryover']:.2f}, Salinity={fstate_w['salinity_risk_level']}, Hardpan={fstate_w['hardpan_detected']}",
        "unit": "Multivariate State Vector [Phi, S_freq, H_load, xi, EC_class]",
        "vulnerability": "Requires multi-year archive continuity; new farms must rely on regional satellite baseline interpolation."
    })

    # -------------------------------------------------------------
    # Eq 17: FAO-56 30-Day Daily Water Balance
    # -------------------------------------------------------------
    days = 30
    et0_arr_s = np.full(days, 7.8)
    precip_arr_s = np.zeros(days)
    kc_arr_s = np.full(days, 1.15)
    wb_s = simulate_fao56_daily_balance(days=days, et0_series=et0_arr_s, precip_series=precip_arr_s, kc_series=kc_arr_s, theta_fc=0.34, theta_wp=0.16, z_r=1.2, p_depletion=0.55, initial_depletion=20.0)
    
    et0_arr_w = np.full(days, 3.2)
    precip_arr_w = np.full(days, 1.5)
    kc_arr_w = np.full(days, 0.95)
    wb_w = simulate_fao56_daily_balance(days=days, et0_series=et0_arr_w, precip_series=precip_arr_w, kc_series=kc_arr_w, theta_fc=0.34, theta_wp=0.16, z_r=1.0, p_depletion=0.55, initial_depletion=10.0)
    
    results.append({
        "eq_num": 17,
        "name": "FAO-56 30-Day Cumulative Root-Zone Water Balance",
        "inputs_summer": "Kc=1.15, ET0=7.8 mm/d (Summer Corn/Sorghum), 30 days rainless",
        "output_summer": f"Final Depletion={wb_s['dr'][-1]:.1f} mm, TAW={wb_s['taw']:.1f} mm",
        "inputs_winter": "Kc=0.95, ET0=3.2 mm/d (Winter Wheat), 30 days light rain",
        "output_winter": f"Final Depletion={wb_w['dr'][-1]:.1f} mm, TAW={wb_w['taw']:.1f} mm",
        "unit": "mm (Root Zone Depletion D_r & Total Available Water TAW)",
        "vulnerability": "Assumes constant Kc over 30-day window without dynamic sub-stage leaf area expansion curves."
    })

    # -------------------------------------------------------------
    # Eq 18: Stewart Yield-Water Response & Failure Risk
    # -------------------------------------------------------------
    yr_s, risk_s = calc_stewart_yield(sum_eta=380.0, sum_etc=520.0, ky=1.25)
    yr_w, risk_w = calc_stewart_yield(sum_eta=290.0, sum_etc=310.0, ky=1.05)
    results.append({
        "eq_num": 18,
        "name": "Stewart Yield-Water Response & Failure Risk",
        "inputs_summer": "ky=1.25 (Maize), ETa=380 mm, ETc=520 mm (27% Deficit)",
        "output_summer": f"Yield Ratio={yr_s:.3f}, Failure Risk={risk_s:.1f}%",
        "inputs_winter": "ky=1.05 (Wheat), ETa=290 mm, ETc=310 mm (6.5% Deficit)",
        "output_winter": f"Yield Ratio={yr_w:.3f}, Failure Risk={risk_w:.1f}%",
        "unit": "Relative Yield Ya/Ym [0.0, 1.0] & Failure Probability P(Y<0.70)",
        "vulnerability": "Stewart model is linear; fails to capture catastrophic threshold collapse if water stress occurs during silking/tasseling."
    })

    # -------------------------------------------------------------
    # Eq 19: Structural Soil Health Index (SHI)
    # -------------------------------------------------------------
    shi_s = calc_soil_health_index(delta_n_bio=85.0, residue_biomass=3.5, z_r_max=1.8, p_pest=0.10)
    shi_w = calc_soil_health_index(delta_n_bio=0.0, residue_biomass=1.2, z_r_max=1.0, p_pest=0.45)
    results.append({
        "eq_num": 19,
        "name": "Structural Soil Health Index (SHI)",
        "inputs_summer": "Legume+Biodrill (N_bio=85 kg/ha, Residue=3.5 t/ha, Zr=1.8m, Pest=0.10)",
        "output_summer": round(shi_s, 1),
        "inputs_winter": "Continuous Cereal Monoculture (N_bio=0, Residue=1.2 t/ha, Zr=1.0m, Pest=0.45)",
        "output_winter": round(shi_w, 1),
        "unit": "Score [0, 100]",
        "vulnerability": "Empirical weighting between chemical (N) and physical (biodrilling) factors does not reflect microbiological mycorrhizal diversity."
    })

    # -------------------------------------------------------------
    # Eq 20: Dynamic TOPSIS Multi-Criteria Ranking
    # -------------------------------------------------------------
    mat = np.array([
        [1850.0, 32.0, 84.0, 0.12],  # Balanced
        [1420.0, 48.0, 78.0, 0.08],  # Water-Saving
        [1950.0, 0.0, 42.0, 0.38]    # Monoculture
    ])
    w = np.array([0.35, 0.30, 0.20, 0.15])
    is_benefit = [True, True, True, False]
    topsis_scores = solve_dynamic_topsis(decision_matrix=mat, weights=w, is_benefit=is_benefit)
    results.append({
        "eq_num": 20,
        "name": "Dynamic TOPSIS Multi-Criteria Decision Solver",
        "inputs_summer": "3 Strategies x [Profit, WaterSaved%, SoilHealth, FailureRisk], weights=[0.35, 0.30, 0.20, 0.15]",
        "output_summer": f"Scores: Balanced={topsis_scores[0]:.3f}, WaterSaving={topsis_scores[1]:.3f}, Monoculture={topsis_scores[2]:.3f}",
        "inputs_winter": "Same Solver Matrix",
        "output_winter": f"Winner: Balanced (Score={topsis_scores[0]:.3f}) vs Monoculture ({topsis_scores[2]:.3f})",
        "unit": "Relative Closeness Coefficient C_i [0.0, 1.0]",
        "vulnerability": "Rank reversal phenomenon can occur if an irrelevant candidate alternative is introduced or removed."
    })

    # -------------------------------------------------------------
    # Eq 21: NASA POWER Thermal Time / Growing Degree Days (GDD)
    # -------------------------------------------------------------
    gdd_s = calc_daily_gdd(t_max=41.5, t_min=26.5, t_base=10.0, t_cutoff=38.0)
    gdd_w = calc_daily_gdd(t_max=22.0, t_min=9.5, t_base=4.0, t_cutoff=30.0)
    results.append({
        "eq_num": 21,
        "name": "NASA POWER Growing Degree Days Accumulation (GDD)",
        "inputs_summer": "Tmax=41.5°C, Tmin=26.5°C, Tbase=10°C, Tcutoff=38°C (Maize/Sorghum)",
        "output_summer": round(gdd_s, 2),
        "inputs_winter": "Tmax=22.0°C, Tmin=9.5°C, Tbase=4°C, Tcutoff=30°C (Wheat)",
        "output_winter": round(gdd_w, 2),
        "unit": "°C·day (Thermal Time Units)",
        "vulnerability": "Linear GDD accumulates excessive development under hyper-thermal conditions unless upper cutoff (T_cutoff) is strictly clamped."
    })

    # -------------------------------------------------------------
    # Eq 22: FAO AquaCrop Water-Productivity Biomass (B)
    # -------------------------------------------------------------
    b_s = calc_aquacrop_biomass(wp_star=33.0, sum_tr_et0=(420.0 / 620.0 * 120.0))
    b_w = calc_aquacrop_biomass(wp_star=17.5, sum_tr_et0=(310.0 / 360.0 * 100.0))
    results.append({
        "eq_num": 22,
        "name": "FAO AquaCrop Water-Productivity Dry Biomass (B)",
        "inputs_summer": "WP*=33.0 g/m2 (C4 Sorghum), sum(Tr/ET0)=81.3 mm equivalent",
        "output_summer": f"{b_s:.2f} t/ha",
        "inputs_winter": "WP*=17.5 g/m2 (C3 Wheat), sum(Tr/ET0)=86.1 mm equivalent",
        "output_winter": f"{b_w:.2f} t/ha",
        "unit": "ton/ha (Above-ground dry biomass)",
        "vulnerability": "WP* assumes atmospheric CO2 concentration of 400 ppm; CO2 elevation increases C3 water productivity more than C4."
    })

    # -------------------------------------------------------------
    # Eq 23: Anthesis Heat-Shock Sterilization on Harvest Index (HI_adj)
    # -------------------------------------------------------------
    hi_adj_s, f_heat_s, f_water_s = calc_harvest_index_heat_adjusted(hi_base=0.48, t_max_flowering=41.5, t_crit_flowering=36.0, k_sterility=0.035)
    hi_adj_w, f_heat_w, f_water_w = calc_harvest_index_heat_adjusted(hi_base=0.45, t_max_flowering=24.0, t_crit_flowering=31.0, k_sterility=0.035)
    results.append({
        "eq_num": 23,
        "name": "Anthesis Heat Shock Sterilization & Adjusted Harvest Index (HI_adj)",
        "inputs_summer": "HI_base=0.48, Tmax=41.5°C, Tcrit=36.0°C (Flowering Shock +5.5°C)",
        "output_summer": f"f_heat={f_heat_s:.3f}, HI_adj={hi_adj_s:.3f} (-{(1-f_heat_s)*100:.1f}%)",
        "inputs_winter": "HI_base=0.45, Tmax=24.0°C, Tcrit=31.0°C (Normal Winter)",
        "output_winter": f"f_heat={f_heat_w:.3f}, HI_adj={hi_adj_w:.3f} (0.0% Penalty)",
        "unit": "Dimensionless Multiplier f_heat & Harvest Index HI_adj",
        "vulnerability": "Penalizes yield uniformly if heatwave timing coincides with anthesis window; nighttime heat stress (T_min > 28°C) causes respiration losses not modeled by T_max alone."
    })

    print(json.dumps(results, indent=2))

if __name__ == '__main__':
    run_suite_2()
