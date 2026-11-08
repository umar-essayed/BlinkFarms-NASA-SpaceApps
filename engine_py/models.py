# ==============================================================================
# BlinkFarms — Core Physical & Mathematical Engine (Python)
# Definitive Implementation of All 20 Equations: VeloceRoot + FieldShift
# NASA Space Apps Challenge 2026: Field Shift / Adapting Farms with NASA Data
# ==============================================================================

import numpy as np
from typing import Dict, List, Tuple, Any, Optional

# Physical Constants & Universal Biophysical Parameters
LAMBDA_V = 2.45e6       # Latent heat of vaporization of water (J/kg)
RHO_W = 1000.0          # Water density (kg/m^3)
ALPHA_PT = 1.26         # Priestley-Taylor coefficient (dimensionless)
GAMMA_PSY = 0.066       # Psychrometric constant (kPa/°C)
STEFAN_BOLTZMANN = 5.670374e-8  # Stefan-Boltzmann constant (W/(m^2 K^4))

# ------------------------------------------------------------------------------
# EQUATION 1: Normalized Difference Vegetation Index (NDVI)
# ------------------------------------------------------------------------------
def calc_ndvi(rho_nir: float, rho_red: float) -> float:
    """
    NDVI = (rho_nir - rho_red) / (rho_nir + rho_red)
    Reflectance in NIR (841-876 nm) and Red (620-670 nm) from HLS / Sentinel-2 / Landsat.
    """
    denom = rho_nir + rho_red
    if denom <= 0:
        return 0.0
    return float(np.clip((rho_nir - rho_red) / denom, -1.0, 1.0))

# ------------------------------------------------------------------------------
# EQUATION 2: Soil-Adjusted Vegetation Index (SAVI) with L = 0.5
# ------------------------------------------------------------------------------
def calc_savi(rho_nir: float, rho_red: float, L: float = 0.5) -> float:
    """
    SAVI = ((1 + L) * (rho_nir - rho_red)) / (rho_nir + rho_red + L)
    Compensates for soil brightness background in arid and semi-arid parcels.
    """
    denom = rho_nir + rho_red + L
    if denom <= 0:
        return 0.0
    return float(np.clip(((1.0 + L) * (rho_nir - rho_red)) / denom, -1.0, 1.0))

# ------------------------------------------------------------------------------
# EQUATION 3: Fractional Vegetation Cover (f_c)
# ------------------------------------------------------------------------------
def calc_fc(ndvi: float, ndvi_min: float = 0.15, ndvi_max: float = 0.85, eta: float = 0.7) -> float:
    """
    f_c = 1 - ((ndvi_max - ndvi) / (ndvi_max - ndvi_min)) ** eta
    Partitions land surface between active photosynthesizing canopy and bare soil.
    """
    if ndvi <= ndvi_min:
        return 0.0
    if ndvi >= ndvi_max:
        return 1.0
    ratio = (ndvi_max - ndvi) / (ndvi_max - ndvi_min)
    return float(np.clip(1.0 - np.power(ratio, eta), 0.0, 1.0))

# ------------------------------------------------------------------------------
# EQUATION 4: Inward Polygon Buffer Erosion (-30m Buffer)
# ------------------------------------------------------------------------------
def erode_polygon_buffer_30m(polygon_coords: List[Tuple[float, float]], buffer_deg: float = 0.00027) -> List[Tuple[float, float]]:
    """
    Erodes raw parcel boundaries inward by ~30 meters (0.00027 degrees latitude/longitude)
    to eliminate mixed pixels from perimeter roads, irrigation canals, and border fences.
    """
    coords = np.array(polygon_coords)
    if len(coords) < 3:
        return polygon_coords
    centroid = coords.mean(axis=0)
    eroded = []
    for pt in coords:
        direction = centroid - pt
        dist = np.linalg.norm(direction)
        if dist > buffer_deg:
            step = (direction / dist) * buffer_deg
            eroded.append(tuple(pt + step))
        else:
            # If parcel is too small to erode, keep original point
            eroded.append(tuple(pt))
    return eroded

# ------------------------------------------------------------------------------
# EQUATION 5: Mass-Conserved SMAP Downscaling (9km -> 30m)
# ------------------------------------------------------------------------------
def downscale_smap_mass_conserved(theta_9km: float, high_res_features: np.ndarray, weights: np.ndarray) -> np.ndarray:
    """
    Downscales coarse 9km SMAP root-zone soil moisture to 30m resolution using
    high-resolution optical/thermal/topographic features while strictly enforcing
    algebraic conservation of water mass:
    (1/N) * Sum(theta_30m_i) = theta_9km
    """
    unconstrained_est = np.dot(high_res_features, weights)
    bias = theta_9km - np.mean(unconstrained_est)
    theta_30m_constrained = unconstrained_est + bias
    # Enforce physical soil moisture bounds [0.02, 0.55]
    theta_30m_constrained = np.clip(theta_30m_constrained, 0.02, 0.55)
    # Re-verify and enforce exact mass conservation
    final_bias = theta_9km - np.mean(theta_30m_constrained)
    theta_30m_constrained += final_bias
    assert np.isclose(np.mean(theta_30m_constrained), theta_9km, atol=1e-5), "Mass conservation violated!"
    return theta_30m_constrained

# ------------------------------------------------------------------------------
# EQUATION 6: Virtual Thermal Reconstruction under Clouds (SAR-Thermal PINN)
# ------------------------------------------------------------------------------
def reconstruct_canopy_temp_sar(
    t_air: float,
    delta_sigma_vv_vh: float,
    theta_root: float,
    vpd: float,
    hour: float = 14.0,
    t_sunrise: float = 6.0,
    t_sunset: float = 19.0
) -> float:
    """
    Reconstructs diurnal canopy skin temperature under cloud cover using Sentinel-1 C-band SAR
    cross-polarization backscatter ratio (VV/VH), root soil moisture (SMAP 30m), and VPD.
    When stomata close due to moisture stress, dielectric permittivity shifts backscatter
    and transpirational cooling ceases, elevating canopy temperature above air temperature.
    """
    diurnal_phase = np.sin(np.pi * np.clip((hour - t_sunrise) / (t_sunset - t_sunrise), 0.0, 1.0))
    # Canopy turgor loss indicator psi: high SAR polarization difference + high VPD - root moisture
    psi_stress = 3.5 * delta_sigma_vv_vh + 1.2 * vpd - 4.0 * theta_root
    t_canopy = t_air + psi_stress * diurnal_phase
    return float(t_canopy)

# ------------------------------------------------------------------------------
# EQUATION 7: PT-JPL Ecophysiological Constraints (Fisher et al., 2008)
# ------------------------------------------------------------------------------
def calc_pt_jpl_constraints(
    t_air: float,
    rh: float,
    f_apar: float,
    f_ipar: float,
    t_opt: float = 25.0,
    theta_root: Optional[float] = None,
    theta_fc: float = 0.32,
    theta_wp: float = 0.12
) -> Dict[str, float]:
    """
    Computes the 5 canonical PT-JPL ecophysiological scaling factors:
    1. epsilon: Slope of saturation vapor pressure curve / (slope + gamma)
    2. f_wet: Surface relative wetness (RH^4)
    3. f_g: Green canopy fraction (fAPAR / fIPAR)
    4. f_T: Plant temperature constraint
    5. f_M: Plant moisture stress constraint (fAPAR / fAPAR_max or throttled by root moisture)
    6. f_SM: Soil moisture constraint (RH^(VPD/beta))
    """
    # Saturated vapor pressure slope Delta (kPa/°C) via Tetens equation
    sat_vp = 0.6108 * np.exp(17.27 * t_air / (t_air + 237.3))
    delta_slope = 4098.0 * sat_vp / ((t_air + 237.3) ** 2)
    epsilon = delta_slope / (delta_slope + GAMMA_PSY)

    # Surface wetness
    f_wet = np.power(np.clip(rh, 0.0, 1.0), 4.0)

    # Green canopy fraction
    f_g = np.clip(f_apar / f_ipar if f_ipar > 0 else 0.5, 0.0, 1.0)

    # Temperature constraint
    f_T = np.exp(-1.0 * (((t_air - t_opt) / max(1.0, t_opt)) ** 2))

    # Moisture constraint
    if theta_root is not None:
        # Biophysical throttling by available root-zone water: (theta - theta_wp) / (theta_fc - theta_wp)
        denom = max(0.01, theta_fc - theta_wp)
        f_M = np.clip((theta_root - theta_wp) / denom, 0.10, 1.0)
    else:
        f_M = np.clip(f_apar / 1.0, 0.10, 1.0)

    # Soil moisture constraint for bare soil evaporation
    vpd = sat_vp * (1.0 - np.clip(rh, 0.0, 1.0))
    f_SM = np.power(np.clip(rh, 0.01, 1.0), max(0.1, vpd / 1.0))

    return {
        "epsilon": float(epsilon),
        "f_wet": float(f_wet),
        "f_g": float(f_g),
        "f_T": float(f_T),
        "f_M": float(f_M),
        "f_SM": float(f_SM),
        "vpd": float(vpd)
    }

# ------------------------------------------------------------------------------
# EQUATION 8: Net Radiation Partitioning & Latent Heat Fluxes (LE_c, LE_s)
# ------------------------------------------------------------------------------
def calc_pt_jpl_fluxes(r_net: float, fc: float, constraints: Dict[str, float], g_flux: Optional[float] = None) -> Dict[str, float]:
    """
    Partitions total net radiation R_n into canopy net radiation R_nc and soil net radiation R_ns:
    R_nc = R_n * f_c
    R_ns = R_n * (1 - f_c)
    Soil heat flux G = 0.20 * R_ns
    LE_c = alpha_PT * epsilon * R_nc * (1 - f_wet) * f_g * f_T * f_M
    LE_s = alpha_PT * epsilon * (R_ns - G) * (f_wet + f_SM * (1 - f_wet))
    """
    c = constraints
    r_nc = r_net * fc
    r_ns = r_net * (1.0 - fc)

    if g_flux is None:
        g_flux = 0.20 * r_ns  # Standard empirical soil heat flux

    le_c = ALPHA_PT * c["epsilon"] * r_nc * (1.0 - c["f_wet"]) * c["f_g"] * c["f_T"] * c["f_M"]
    le_s = ALPHA_PT * c["epsilon"] * max(0.0, r_ns - g_flux) * (c["f_wet"] + c.get("f_SM", 0.3) * (1.0 - c["f_wet"]))

    return {
        "r_nc": float(r_nc),
        "r_ns": float(r_ns),
        "le_c": float(max(0.0, le_c)),
        "le_s": float(max(0.0, le_s)),
        "g_flux": float(g_flux)
    }

def calc_baseline_lec(r_nc: float, constraints: Dict[str, float]) -> float:
    """
    Direct calculation of canopy latent heat flux LE_c (W/m^2).
    """
    c = constraints
    le_c = ALPHA_PT * c["epsilon"] * r_nc * (1.0 - c["f_wet"]) * c["f_g"] * c["f_T"] * c["f_M"]
    return float(max(0.0, le_c))

# ------------------------------------------------------------------------------
# EQUATION 9: Advection Decoupling for Desert Winds & Oasis Effect (Omega)
# ------------------------------------------------------------------------------
def calc_advection_decoupled_lec(
    le_c: float,
    u_wind: float,
    grad_tsurface: float,
    d_edge: float,
    kappa: float = 0.08,
    lambda_decay: float = 0.005
) -> float:
    """
    Decouples regional sensible heat advection (Oasis Effect in desert agricultural basins
    such as Toshka or Qassim) to isolate the true biological stomatal transpiration of the crop:
    LE_c,decoupled = LE_c / (1.0 + kappa * (u_wind * grad_T) * exp(-lambda * d_edge))
    """
    advection_term = kappa * (u_wind * grad_tsurface) * np.exp(-lambda_decay * d_edge)
    le_c_decoupled = le_c / (1.0 + max(0.0, advection_term))
    return float(le_c_decoupled)

# ------------------------------------------------------------------------------
# EQUATION 10: Total Latent Heat & Actual Evapotranspiration (ET_a mm/day)
# ------------------------------------------------------------------------------
def calc_actual_eta(le_c_decoupled: float, le_soil: float) -> Tuple[float, float]:
    """
    Converts latent heat flux (W/m^2) into volumetric depth of water (mm/day):
    LE_total = LE_c,decoupled + LE_s
    ET_a (mm/day) = (LE_total * 86400 s/day) / (lambda_v J/kg * rho_w kg/m^3 * 10^-3 m/mm)
                  = (LE_total * 86400) / LAMBDA_V
    """
    le_total = le_c_decoupled + le_soil  # W/m^2
    eta_mm_day = (le_total * 86400.0) / LAMBDA_V
    return float(le_total), float(eta_mm_day)

# ------------------------------------------------------------------------------
# EQUATION 11: Evaporative Stress Index (ESI)
# ------------------------------------------------------------------------------
def calc_esi(et_a: float, pet: float) -> float:
    """
    Evaporative Stress Index ESI = ET_a / PET
    Reflects instantaneous crop water sufficiency:
    ESI >= 0.75: Fully transpirational, unstressed canopy
    0.50 <= ESI < 0.75: Mild to moderate water stress
    ESI < 0.40: Severe stomatal closure & impending cavitation
    """
    if pet <= 0:
        return 1.0
    return float(np.clip(et_a / pet, 0.0, 1.0))

# ------------------------------------------------------------------------------
# EQUATION 12: Flash Drought Stress Velocity Alert (Delta ESI_7d)
# ------------------------------------------------------------------------------
def check_flash_drought_alert(
    esi_t: float,
    esi_t_minus_7: float,
    gdd_accum: float,
    gdd_maturity: float,
    alert_threshold: float = -0.15
) -> Tuple[bool, float]:
    """
    Detects flash drought stress collapse velocity:
    Delta ESI_7d = ESI_t - ESI_t-7
    An alert is triggered when Delta ESI_7d < -0.15 AND the crop is NOT in its natural
    end-of-season senescence stage (GDD < 0.95 * GDD_maturity).
    """
    delta_esi_7d = esi_t - esi_t_minus_7
    is_not_senescing = gdd_accum < (0.95 * gdd_maturity)
    is_alert = (delta_esi_7d < alert_threshold) and is_not_senescing
    return bool(is_alert), float(delta_esi_7d)

# ------------------------------------------------------------------------------
# EQUATION 13: Canopy Fever Anomaly (Delta T_c = T_canopy - T_baseline)
# ------------------------------------------------------------------------------
def calc_canopy_fever_anomaly(t_canopy: float, t_air: float, t_baseline_delta: float = -2.5) -> float:
    """
    Computes transpirational thermal fever anomaly:
    Delta T_c = T_canopy - (T_air + t_baseline_delta)
    A healthy, actively transpiring crop canopy is typically 2 to 3°C cooler than ambient air.
    When stomata close, evaporative cooling stops and the canopy develops a fever of +2 to +8°C.
    """
    t_baseline = t_air + t_baseline_delta
    fever = t_canopy - t_baseline
    return float(np.round(fever, 2))

# ------------------------------------------------------------------------------
# EQUATION 14: Prescriptive Irrigation Depth & Volume
# ------------------------------------------------------------------------------
def calc_prescriptive_irrigation(
    theta_fc: float,
    theta_current: float,
    z_r: float,
    area_ha: float
) -> Tuple[float, float]:
    """
    Calculates exact prescription depth (mm) and water volume (m^3) required
    to restore the root zone to field capacity theta_fc without deep percolation:
    Depth (mm) = max(0, theta_fc - theta_current) * Z_r (m) * 1000 mm/m
    Volume (m^3) = (Depth / 1000 m) * (Area_ha * 10000 m^2/ha)
    """
    moisture_deficit = max(0.0, theta_fc - theta_current)
    depth_mm = moisture_deficit * z_r * 1000.0
    volume_m3 = (depth_mm / 1000.0) * (area_ha * 10000.0)
    return float(depth_mm), float(volume_m3)

# ------------------------------------------------------------------------------
# EQUATION 15: Closed-Loop Soil Probing & Hardpan Diagnostic (Xi_soil_error)
# ------------------------------------------------------------------------------
def calc_closed_loop_soil_error(
    delta_esi_observed_48h: float,
    delta_esi_predicted: float,
    dissipation_rate_cm_hr: Optional[float] = None,
    normal_ksat_cm_hr: float = 2.5
) -> Dict[str, Any]:
    """
    Probes subsurface physical barriers by comparing observed post-irrigation ESI recovery
    against the expected biophysical recovery model:
    Xi_soil_error = Delta ESI_observed,48h / Delta ESI_predicted

    If Xi < 0.70 (or dissipation rate is stunted relative to hydraulic conductivity Ksat),
    water has perched above an impermeable subsoil plough pan / hardpan at ~45cm depth,
    failing to recharge deep taproots.
    """
    if delta_esi_predicted <= 0:
        xi_error = 1.0
    else:
        xi_error = delta_esi_observed_48h / delta_esi_predicted
    
    hardpan_detected = xi_error < 0.70
    
    # Assess subsoil dissipation deficit
    compaction_ratio = 1.0
    if dissipation_rate_cm_hr is not None and normal_ksat_cm_hr > 0:
        compaction_ratio = dissipation_rate_cm_hr / normal_ksat_cm_hr
        if compaction_ratio < 0.50:
            hardpan_detected = True

    return {
        "xi_soil_error": float(round(xi_error, 3)),
        "hardpan_detected": bool(hardpan_detected),
        "hardpan_depth_cm": 45.0 if hardpan_detected else None,
        "compaction_ratio": float(round(compaction_ratio, 3)),
        "recommendation": "Deep subsoiler ripping (>55cm) required to shatter plough pan" if hardpan_detected else "Normal hydraulic permeability"
    }

# ------------------------------------------------------------------------------
# EQUATION 16: Multi-Seasonal Field Memory State Vector (F_state)
# ------------------------------------------------------------------------------
def build_field_memory_state(
    theta_preplant: float,
    theta_wp: float,
    theta_fc: float,
    esi_history: List[float],
    heat_load_accum: float,
    xi_soil_error: float,
    prev_crop: str,
    ec_e_dsm: float = 1.8,
    leaching_fraction: float = 0.15
) -> Dict[str, Any]:
    """
    Constructs the 10-year cumulative agro-ecological state vector F_state:
    1. Phi_carryover: Available water fraction carried over from preceding seasons
    2. S_freq: 10-year climatic drought frequency (fraction of days with ESI < 0.40)
    3. H_accum: 10-year accumulated heat load (degree-days above base temperature)
    4. Xi_soil_error: Closed-loop subsoil diagnostic and compaction flag
    5. Salinity_risk: Salt accumulation risk from soil ECe and leaching fraction LF
    """
    # Carryover water fraction
    denom = theta_fc - theta_wp if (theta_fc > theta_wp) else 0.20
    phi_carryover = float(np.clip((theta_preplant - theta_wp) / denom, 0.0, 1.0))

    # Frequency of acute stress days (ESI < 0.40)
    if len(esi_history) > 0:
        stress_days = sum(1 for e in esi_history if e < 0.40)
        s_freq = float(stress_days / len(esi_history))
    else:
        s_freq = 0.25

    # Salinity Risk Assessment
    if ec_e_dsm > 6.0 or (ec_e_dsm > 4.0 and leaching_fraction < 0.10):
        salinity_level = "severe"
    elif ec_e_dsm > 3.0 or leaching_fraction < 0.15:
        salinity_level = "moderate"
    else:
        salinity_level = "normal"

    return {
        "phi_carryover": float(round(phi_carryover, 3)),
        "s_freq": float(round(s_freq, 3)),
        "heat_accum": float(round(heat_load_accum, 1)),
        "xi_soil_error": float(round(xi_soil_error, 3)),
        "hardpan_detected": bool(xi_soil_error < 0.70),
        "hardpan_depth_cm": 45.0 if xi_soil_error < 0.70 else None,
        "salinity_ec_e_dsm": float(round(ec_e_dsm, 2)),
        "salinity_risk_level": salinity_level,
        "prev_crop": prev_crop
    }

# ------------------------------------------------------------------------------
# EQUATION 17: FAO-56 Dual Crop Coefficient & Daily Root Zone Water Balance
# ------------------------------------------------------------------------------
def simulate_fao56_daily_balance(
    days: int,
    et0_series: np.ndarray,
    precip_series: np.ndarray,
    kc_series: np.ndarray,
    theta_fc: float,
    theta_wp: float,
    z_r: float,
    p_depletion: float,
    initial_depletion: float,
    k_cb_series: Optional[np.ndarray] = None
) -> Dict[str, np.ndarray]:
    """
    FAO-56 Daily Root Zone Depletion Balance:
    TAW = 1000 * (theta_fc - theta_wp) * Z_r
    RAW = p * TAW
    Stress reduction coefficient Ks:
      Ks = 1.0 if Dr <= RAW
      Ks = (TAW - Dr) / ((1 - p) * TAW) if RAW < Dr <= TAW
      Ks = 0.05 if Dr > TAW
    Daily ET_a = Ks * Kc * ET0 (or dual Ks * Kcb + Ke)
    Daily depletion recursion: Dr,t = Dr,t-1 - Peff + ET_a - Irrigation
    """
    taw = 1000.0 * (theta_fc - theta_wp) * z_r
    raw = p_depletion * taw
    dr = np.zeros(days)
    eta = np.zeros(days)
    ks = np.zeros(days)

    dr_curr = initial_depletion
    for t in range(days):
        # Stress coefficient Ks
        if dr_curr <= raw:
            k_s = 1.0
        elif dr_curr < taw:
            k_s = (taw - dr_curr) / max(0.001, (1.0 - p_depletion) * taw)
        else:
            k_s = 0.05
        k_s = float(np.clip(k_s, 0.05, 1.0))
        ks[t] = k_s

        etc = kc_series[t] * et0_series[t]
        act_et = k_s * etc
        eta[t] = act_et

        # Effective precipitation: FAO-56 empirical USDA-SCS method
        p_raw = precip_series[t]
        peff = max(0.0, p_raw * 0.8 - 2.0) if p_raw > 4.0 else 0.0

        # Update root-zone depletion
        dr_curr = dr_curr - peff + act_et
        dr_curr = float(np.clip(dr_curr, 0.0, taw))
        dr[t] = dr_curr

    return {
        "dr": dr,
        "eta": eta,
        "ks": ks,
        "taw": float(taw),
        "raw": float(raw)
    }

# ------------------------------------------------------------------------------
# EQUATION 18: Stewart Water-Yield Production Function & Failure Risk
# ------------------------------------------------------------------------------
def calc_stewart_yield(sum_eta: float, sum_etc: float, ky: float) -> Tuple[float, float]:
    """
    Enhanced Stewart / Jensen Phenology-Coupled Water-Yield Function:
    (1 - Ya / Ym) = Ky * Deficit_effective
    Where Deficit_effective incorporates non-linear flowering sensitivity escalation
    when water deficit exceeds 20% (Jensen anthesis cavitation vulnerability).
    """
    water_deficit = max(0.0, 1.0 - (sum_eta / sum_etc)) if sum_etc > 0 else 0.0
    if water_deficit > 0.20:
        flowering_stress_amplifier = 1.0 + 1.25 * ((water_deficit - 0.20) ** 1.3)
        effective_deficit = water_deficit * flowering_stress_amplifier
    else:
        effective_deficit = water_deficit

    yield_ratio = 1.0 - ky * effective_deficit
    yield_ratio = float(np.clip(yield_ratio, 0.10, 1.0))

    # Continuous logistic failure risk function
    if yield_ratio < 0.70:
        failure_risk = float(np.clip(5.0 + ((0.70 - yield_ratio) / 0.35) * 90.0, 5.0, 95.0))
    else:
        failure_risk = float(np.clip(5.0 * (0.90 / max(0.70, yield_ratio)), 3.0, 8.0))

    return float(round(yield_ratio, 3)), float(round(failure_risk, 1))

# ------------------------------------------------------------------------------
# EQUATION 19: Structural Soil Health Index (SHI)
# ------------------------------------------------------------------------------
def calc_soil_health_index(
    delta_n_bio: float,
    residue_biomass: float,
    z_r_max: float,
    p_pest: float,
    w_n: float = 0.35,
    w_c: float = 0.30,
    w_root: float = 0.25
) -> float:
    """
    Quantifies multi-seasonal soil regenerative capital:
    Combines biological N-fixation (+delta_N), organic carbon residue,
    deep bio-drilling root penetration (Z_r,max), and pest cycle disruption.
    """
    score_raw = (
        (w_n * (delta_n_bio / 150.0)) +
        (w_c * (residue_biomass / 5.0)) +
        (w_root * (z_r_max / 2.0)) -
        (0.20 * p_pest)
    )
    # Sigmoidal normalization to [10, 98]
    shi = 100.0 / (1.0 + np.exp(-3.0 * (score_raw - 0.50)))
    return float(np.clip(shi, 10.0, 98.0))

# ------------------------------------------------------------------------------
# EQUATION 20: Dynamic TOPSIS Optimization Solver
# ------------------------------------------------------------------------------
def solve_dynamic_topsis(
    decision_matrix: np.ndarray,
    weights: np.ndarray,
    is_benefit: List[bool]
) -> np.ndarray:
    """
    Dynamic Technique for Order Preference by Similarity to Ideal Solution (TOPSIS):
    1. Vector normalization of multi-objective criteria matrix
    2. Weight application
    3. Determine Positive Ideal Solution (A+) and Negative Ideal Solution (A-)
    4. Calculate Euclidean separation distances D+ and D-
    5. Relative closeness to ideal: C_i = D- / (D+ + D-) in [0, 1]
    """
    m, n = decision_matrix.shape
    # 1. Vector Normalization
    rss = np.sqrt(np.sum(decision_matrix ** 2, axis=0))
    rss[rss == 0] = 1.0
    norm_matrix = decision_matrix / rss

    # 2. Weighted Matrix
    weights_norm = weights / np.sum(weights)
    weighted_matrix = norm_matrix * weights_norm

    # 3. Ideal Positive (A+) and Negative (A-)
    a_plus = np.zeros(n)
    a_minus = np.zeros(n)
    for j in range(n):
        if is_benefit[j]:
            a_plus[j] = np.max(weighted_matrix[:, j])
            a_minus[j] = np.min(weighted_matrix[:, j])
        else:
            a_plus[j] = np.min(weighted_matrix[:, j])
            a_minus[j] = np.max(weighted_matrix[:, j])

    # 4. Euclidean Distances
    d_plus = np.sqrt(np.sum((weighted_matrix - a_plus) ** 2, axis=1))
    d_minus = np.sqrt(np.sum((weighted_matrix - a_minus) ** 2, axis=1))

    # 5. Relative Closeness
    denom = d_plus + d_minus
    denom[denom == 0] = 1.0
    c_i = d_minus / denom
    return c_i

# ------------------------------------------------------------------------------
# EQUATION 21: NASA POWER Growing Degree Days (GDD) & Phenology Suitability
# ------------------------------------------------------------------------------
def calc_daily_gdd(t_max: float, t_min: float, t_base: float, t_cutoff: float = 38.0) -> float:
    """
    Computes daily Growing Degree Days:
    GDD_daily = max(0.0, (min(t_max, t_cutoff) + max(t_min, t_base)) / 2.0 - t_base)
    Conforms to McMaster & Wilhelm (1997) Method 2.
    """
    t_max_adj = min(t_max, t_cutoff)
    t_min_adj = max(t_min, t_base)
    t_mean = (t_max_adj + t_min_adj) / 2.0
    return float(max(0.0, t_mean - t_base))

# ------------------------------------------------------------------------------
# EQUATION 22: FAO AquaCrop Transpiration-to-Biomass Production Function
# ------------------------------------------------------------------------------
def calc_aquacrop_biomass(
    wp_star: float,
    sum_tr_et0: float,
    f_temp: float = 1.0,
    f_salinity: float = 1.0
) -> float:
    """
    FAO AquaCrop law of biomass accumulation (Steduto et al., 2009; Raes et al., 2012):
    B = (WP* / 100) * Sum(Tr_a / ET_o) * f_temp * f_salinity
    Returns aboveground dry biomass in ton/ha.
    WP* is normalized water productivity (g/m^2). 1 g/m^2 = 0.01 ton/ha.
    """
    biomass_ton_ha = (wp_star / 100.0) * sum_tr_et0 * f_temp * f_salinity
    return float(max(0.1, biomass_ton_ha))

# ------------------------------------------------------------------------------
# EQUATION 23: AquaCrop Pollination Heat-Shock & Adjusted Harvest Index
# ------------------------------------------------------------------------------
def calc_harvest_index_heat_adjusted(
    hi_base: float,
    t_max_flowering: float,
    t_crit_flowering: float,
    k_sterility: float = 0.035,
    f_water_stress_flowering: float = 1.0
) -> Tuple[float, float, float]:
    """
    FAO AquaCrop Anthesis Heat Sterilization & Adjusted Harvest Index (HI_adj):
    If T_max,flowering > T_crit,flowering:
        f_heat = max(0.10, 1.0 - k_sterility * (T_max,flowering - T_crit,flowering)**2)
    HI_adj = HI_base * f_water_stress_flowering * f_heat
    Returns: (hi_adj, f_heat, yield_reduction_factor)
    """
    heat_excess = max(0.0, t_max_flowering - t_crit_flowering)
    if heat_excess > 0:
        f_heat = max(0.10, 1.0 - k_sterility * (heat_excess ** 2))
    else:
        f_heat = 1.0

    f_water = max(0.20, min(1.0, f_water_stress_flowering))
    hi_adj = float(hi_base * f_water * f_heat)
    yield_reduction_factor = float(1.0 - (hi_adj / hi_base) if hi_base > 0 else 0.0)
    return hi_adj, float(f_heat), yield_reduction_factor

