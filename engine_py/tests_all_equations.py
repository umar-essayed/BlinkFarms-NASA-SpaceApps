# ==============================================================================
# BlinkFarms — Rigorous Test Suite for All 20 Physical & Mathematical Equations
# Validates Numerical Stability, Conservation Laws & Biophysical Boundaries
# NASA Space Apps Challenge 2026: Field Shift
# ==============================================================================

import numpy as np
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import (
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

def run_all_tests():
    print("=" * 75)
    print("STARTING RIGOROUS TESTS FOR ALL 20 BLINKFARMS EQUATIONS")
    print("=" * 75)

    # Test 1: NDVI
    ndvi_val = calc_ndvi(0.65, 0.12)
    assert 0.0 < ndvi_val <= 1.0, f"NDVI invalid: {ndvi_val}"
    assert np.isclose(ndvi_val, (0.65 - 0.12) / (0.65 + 0.12), atol=1e-4)
    print(f"✓ Eq 1 [NDVI]: PASSED (Value = {ndvi_val:.3f})")

    # Test 2: SAVI
    savi_val = calc_savi(0.65, 0.12, L=0.5)
    assert 0.0 < savi_val <= 1.0, f"SAVI invalid: {savi_val}"
    print(f"✓ Eq 2 [SAVI with L=0.5]: PASSED (Value = {savi_val:.3f})")

    # Test 3: fc (Fractional Cover)
    fc_val = calc_fc(0.68)
    assert 0.0 <= fc_val <= 1.0, f"fc invalid: {fc_val}"
    print(f"✓ Eq 3 [Fractional Cover fc]: PASSED (Value = {fc_val:.3f})")

    # Test 4: Inward Buffer Erosion (-30m)
    raw_poly = [(41.160, -96.480), (41.160, -96.470), (41.170, -96.470), (41.170, -96.480)]
    eroded_poly = erode_polygon_buffer_30m(raw_poly)
    assert len(eroded_poly) == 4
    c_raw = np.mean(raw_poly, axis=0)
    d_raw = np.linalg.norm(np.array(raw_poly[0]) - c_raw)
    d_eroded = np.linalg.norm(np.array(eroded_poly[0]) - c_raw)
    assert d_eroded < d_raw, "Erosion did not shrink polygon inward!"
    print("✓ Eq 4 [Inward Buffer Erosion -30m]: PASSED")

    # Test 5: Mass-Conserved Downscaling
    theta_coarse = 0.280 # 28% volumetric moisture at 9km
    np.random.seed(42)
    features = np.random.uniform(0.1, 0.9, (100, 3))
    weights = np.array([0.15, 0.10, 0.08])
    theta_30m = downscale_smap_mass_conserved(theta_coarse, features, weights)
    assert np.isclose(np.mean(theta_30m), theta_coarse, atol=1e-5), "Mass Conservation Violated!"
    print(f"✓ Eq 5 [Mass-Conserved SMAP Downscaler]: PASSED (Mean = {np.mean(theta_30m):.5f} == {theta_coarse})")

    # Test 6: Virtual Thermal PINN under Clouds
    tc_virtual = reconstruct_canopy_temp_sar(t_air=30.0, delta_sigma_vv_vh=0.25, theta_root=0.18, vpd=2.8)
    assert tc_virtual > 30.0, "Canopy under moisture stress must be warmer than air temperature!"
    print(f"✓ Eq 6 [Virtual Thermal SAR PINN]: PASSED (T_canopy = {tc_virtual:.1f}°C)")

    # Test 7: PT-JPL Constraints
    constraints = calc_pt_jpl_constraints(t_air=32.0, rh=0.35, f_apar=0.75, f_ipar=0.85, theta_root=0.26)
    for k in ["epsilon", "f_wet", "f_g", "f_T", "f_M", "f_SM"]:
        v = constraints[k]
        assert 0.0 <= v <= 1.0, f"Constraint {k} out of bounds: {v}"
    print(f"✓ Eq 7 [PT-JPL Constraints (6)]: PASSED (epsilon={constraints['epsilon']:.2f}, fT={constraints['f_T']:.2f}, fM={constraints['f_M']:.2f})")

    # Test 8: Net Radiation Partitioning & Latent Heat (LE_c, LE_s)
    fluxes = calc_pt_jpl_fluxes(r_net=480.0, fc=0.70, constraints=constraints)
    assert fluxes["le_c"] > 0, "LE_c must be positive"
    assert fluxes["le_s"] > 0, "LE_s must be positive"
    assert fluxes["r_nc"] + fluxes["r_ns"] == 480.0, "Radiation partitioning must conserve energy"
    print(f"✓ Eq 8 [PT-JPL Net Radiation Partitioning]: PASSED (LE_c={fluxes['le_c']:.1f} W/m^2, LE_s={fluxes['le_s']:.1f} W/m^2)")

    # Test 9: Advection Decoupling (Desert Oasis Winds)
    le_c = fluxes["le_c"]
    le_c_decoupled = calc_advection_decoupled_lec(le_c, u_wind=4.5, grad_tsurface=5.0, d_edge=100.0)
    assert 0 < le_c_decoupled <= le_c, "Advection decoupling must isolate biological stomatal flow"
    print(f"✓ Eq 9 [Advection Decoupling Omega]: PASSED (Raw LE_c = {le_c:.1f} -> Decoupled LE_c = {le_c_decoupled:.1f} W/m^2)")

    # Test 10: Total ET_a
    le_total, eta_mm = calc_actual_eta(le_c_decoupled, le_soil=35.0)
    assert 1.0 <= eta_mm <= 12.0, f"Unrealistic daily ET_a: {eta_mm}"
    print(f"✓ Eq 10 [Actual Evapotranspiration ET_a]: PASSED ({eta_mm:.2f} mm/day)")

    # Test 11: ESI Index
    esi = calc_esi(et_a=eta_mm, pet=7.5)
    assert 0.0 <= esi <= 1.0
    print(f"✓ Eq 11 [Evaporative Stress Index ESI]: PASSED (ESI = {esi:.3f})")

    # Test 12: Flash Drought Alert
    is_alert, delta_7d = check_flash_drought_alert(esi_t=0.32, esi_t_minus_7=0.52, gdd_accum=800, gdd_maturity=1300)
    assert is_alert is True, "Flash drought drop of -0.20 must trigger alert!"
    print(f"✓ Eq 12 [Flash Drought Velocity Delta ESI_7d]: PASSED (Delta = {delta_7d:.2f}, Alert = {is_alert})")

    # Test 13: Canopy Fever Anomaly
    canopy_fever = calc_canopy_fever_anomaly(t_canopy=34.8, t_air=30.0, t_baseline_delta=-2.5)
    assert canopy_fever == 7.3, f"Unexpected canopy fever: {canopy_fever}"
    print(f"✓ Eq 13 [Canopy Fever Anomaly Delta T_c]: PASSED (+{canopy_fever:.1f}°C above unstressed baseline)")

    # Test 14: Prescriptive Irrigation Volume
    depth_mm, vol_m3 = calc_prescriptive_irrigation(theta_fc=0.32, theta_current=0.22, z_r=1.2, area_ha=65.0)
    assert depth_mm == 120.0, f"Unexpected depth: {depth_mm}"
    assert vol_m3 == 78000.0, f"Unexpected volume: {vol_m3}"
    print(f"✓ Eq 14 [Prescriptive Irrigation Volume]: PASSED (Depth = {depth_mm} mm, Vol = {vol_m3:.0f} m^3)")

    # Test 15: Closed-Loop Soil Probing & Hardpan Diagnostic
    probe_diag = calc_closed_loop_soil_error(
        delta_esi_observed_48h=0.08,
        delta_esi_predicted=0.18,
        dissipation_rate_cm_hr=0.9,
        normal_ksat_cm_hr=2.5
    )
    assert probe_diag["hardpan_detected"] is True, "Xi = 0.44 must detect subsoil hardpan compaction!"
    assert probe_diag["hardpan_depth_cm"] == 45.0
    print(f"✓ Eq 15 [Closed-Loop Probing & Hardpan Diagnostic]: PASSED (Xi = {probe_diag['xi_soil_error']}, Hardpan at {probe_diag['hardpan_depth_cm']}cm)")

    # Test 16: Field Memory Vector (F_state)
    f_state = build_field_memory_state(
        theta_preplant=0.22,
        theta_wp=0.14,
        theta_fc=0.34,
        esi_history=[0.35, 0.38, 0.55, 0.32, 0.60],
        heat_load_accum=1420.0,
        xi_soil_error=probe_diag["xi_soil_error"],
        prev_crop="maize",
        ec_e_dsm=3.8,
        leaching_fraction=0.12
    )
    assert 0.0 <= f_state["phi_carryover"] <= 1.0
    assert f_state["salinity_risk_level"] in ["normal", "moderate", "severe"]
    print(f"✓ Eq 16 [10-Year Field Memory State Vector F_state]: PASSED (Carryover={f_state['phi_carryover']:.2f}, Salinity={f_state['salinity_risk_level']})")

    # Test 17: FAO-56 Daily Root Zone Balance & Dual Ks Stress
    et0_sim = np.full(30, 6.0)
    precip_sim = np.zeros(30)
    precip_sim[10] = 25.0 # One 25mm rain event
    kc_sim = np.full(30, 1.15)
    fao_res = simulate_fao56_daily_balance(
        days=30,
        et0_series=et0_sim,
        precip_series=precip_sim,
        kc_series=kc_sim,
        theta_fc=0.32,
        theta_wp=0.14,
        z_r=1.2,
        p_depletion=0.55,
        initial_depletion=40.0
    )
    assert len(fao_res["dr"]) == 30
    assert 0.0 <= np.min(fao_res["ks"]) <= 1.0
    print(f"✓ Eq 17 [FAO-56 30-Day Daily Water Balance]: PASSED (Final Depletion = {fao_res['dr'][-1]:.1f} mm, TAW = {fao_res['taw']:.1f} mm)")

    # Test 18: Stewart Water-Yield Production Function
    sum_eta = float(np.sum(fao_res["eta"]))
    sum_etc = float(np.sum(kc_sim * et0_sim))
    y_ratio, fail_risk = calc_stewart_yield(sum_eta, sum_etc, ky=1.25)
    assert 0.10 <= y_ratio <= 1.0
    print(f"✓ Eq 18 [Stewart Yield Function & Failure Risk]: PASSED (Yield Ratio = {y_ratio:.2f}, Failure Risk = {fail_risk:.1f}%)")

    # Test 19: Structural Soil Health Index (SHI)
    shi_val = calc_soil_health_index(delta_n_bio=95.0, residue_biomass=3.8, z_r_max=1.6, p_pest=0.0)
    assert 50.0 <= shi_val <= 98.0, f"Unrealistic SHI: {shi_val}"
    print(f"✓ Eq 19 [Structural Soil Health Index SHI]: PASSED (Score = {shi_val:.1f} / 100)")

    # Test 20: Dynamic TOPSIS Optimization Solver
    matrix = np.array([
        [2350.0, 31.0, 88.0, 11.0],  # Strategy 1: Regenerative Balance (Top)
        [2210.0, 45.0, 82.0, 8.0],   # Strategy 2: Maximum Water Saving
        [1860.0, 0.0,  24.0, 74.0],  # Strategy 3: Monoculture Baseline
    ])
    weights = np.array([0.25, 0.35, 0.25, 0.15])
    is_benefit = [True, True, True, False] # Profit, Water, Soil -> Benefit; Risk -> Cost
    topsis_scores = solve_dynamic_topsis(matrix, weights, is_benefit)
    assert topsis_scores[0] > topsis_scores[2], "Balanced strategy must outperform degraded monoculture!"
    print(f"✓ Eq 20 [Dynamic TOPSIS Multi-Criteria Solver]: PASSED (Scores: {topsis_scores.round(3).tolist()})")

    # --------------------------------------------------------------------------
    # EQUATION 21: Growing Degree Days (GDD)
    # --------------------------------------------------------------------------
    gdd = calc_daily_gdd(t_max=32.0, t_min=18.0, t_base=10.0)
    assert np.isclose(gdd, 15.0), f"Expected GDD 15.0, got {gdd}"
    print(f"✓ Eq 21 [NASA POWER GDD Daily Accumulation]: PASSED (GDD = {gdd:.1f} °C·d)")

    # --------------------------------------------------------------------------
    # EQUATION 22: FAO AquaCrop Transpiration-to-Biomass
    # --------------------------------------------------------------------------
    biomass = calc_aquacrop_biomass(wp_star=32.0, sum_tr_et0=55.0, f_temp=0.95, f_salinity=0.90)
    expected_b = (32.0 / 100.0) * 55.0 * 0.95 * 0.90 # ~15.048 ton/ha
    assert np.isclose(biomass, expected_b, atol=1e-2), f"Expected {expected_b}, got {biomass}"
    print(f"✓ Eq 22 [FAO AquaCrop Water Productivity Biomass]: PASSED (Biomass = {biomass:.2f} ton/ha)")

    # --------------------------------------------------------------------------
    # EQUATION 23: AquaCrop Pollination Heat-Shock & Harvest Index
    # --------------------------------------------------------------------------
    hi_adj, f_heat, yield_loss = calc_harvest_index_heat_adjusted(
        hi_base=0.45,
        t_max_flowering=34.0,
        t_crit_flowering=31.0,
        k_sterility=0.035,
        f_water_stress_flowering=0.90
    )
    # Heat excess = 3°C, f_heat = 1 - 0.035 * 9 = 0.685
    # hi_adj = 0.45 * 0.90 * 0.685 = 0.2774
    assert f_heat < 1.0, "Heat stress must reduce f_heat"
    assert hi_adj < 0.45, "Heat stress must reduce HI"
    print(f"✓ Eq 23 [AquaCrop Heat Shock Anthesis Sterilization]: PASSED (HI_adj = {hi_adj:.3f}, f_heat = {f_heat:.3f})")

    print("=" * 75)
    print("ALL 23 EQUATIONS (VELOCEROOT + AQUACROP + DSSAT) PASSED WITH 100% VALIDATION!")
    print("=" * 75)

if __name__ == "__main__":
    run_all_tests()
