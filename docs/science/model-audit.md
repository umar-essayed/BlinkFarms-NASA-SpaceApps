# Scientific Model Audit & VeloceRoot Specification
**Author:** Agent C — Scientific Model & VeloceRoot Specialist  
**Project:** BlinkFarms / FieldShift / VeloceRoot  
**Date:** November 2026 (NASA Space Apps Challenge 2026)

---

## 1. Resolution of Critical Scientific Inconsistencies

### 1.1 Standardization of ESI, Evaporative Fraction, and Water Stress Index
* **The Conflict:** Prior documentation stated $ESI = 1 - \frac{ET_a}{PET}$ (where 1 is drought, 0 is unstressed), while `engine_py/models.py` and UI widgets implemented $ESI = \frac{ET_a}{PET}$ (where 1 is optimal transpirational cooling, 0 is desiccated cavitation).
* **The Authoritative Reconciliation:**
  We formally decouple and standardize these two metrics to prevent scientific ambiguity:
  1. **Relative Evapotranspiration / Evaporative Fraction ($r_{ET}$):**
     $$r_{ET} = \frac{ET_a}{PET} \quad (0.0 \le r_{ET} \le 1.0)$$
     - Interpretation: $r_{ET} \ge 0.75$: healthy transpirative cooling. $r_{ET} < 0.40$: severe stomatal pore closure.
  2. **Water Stress Index ($WSI$):**
     $$WSI = 1 - r_{ET} = 1 - \frac{ET_a}{PET} \quad (0.0 \le WSI \le 1.0)$$
     - Interpretation: $0$: zero stress, fully transpiring. $1$: complete dehydration.
  3. **NASA ECOSTRESS Evaporative Stress Index (ESI) Anomaly:**
     In NASA's ALEXI/ECOSTRESS product, ESI is the standardized anomaly ($z$-score) of $r_{ET}$ relative to multi-year climatological normal:
     $$ESI_{NASA} = \frac{r_{ET} - \mu_{clim}(r_{ET})}{\sigma_{clim}(r_{ET})}$$
     Negative values indicate below-normal transpiration (drought).
  
  **Rule across BlinkFarms:** The UI and API will explicitly label **كفاءة النتح والتبريد الذاتي ($r_{ET}$)** (higher is better) and **مؤشر الإجهاد المائي ($WSI$)** (lower is better), eliminating conflicting definitions.

---

### 1.2 Elimination of Fabricated Flash Drought Prior Offsets
* **Prior Flaw:** `engine_py/api_server.py:112` called `check_flash_drought_alert(esi, esi + 0.18, ...)`, creating an artificial $-0.18$ drop to trigger alerts on single-point calls.
* **The Correction:**
  A flash drought alert requires actual timestamped degradation over time:
  $$\Delta WSI_{7d} = WSI(t) - WSI(t - 7\text{ days}) = r_{ET}(t - 7\text{ days}) - r_{ET}(t)$$
  - **Watch Alert:** $\Delta WSI_{7d} \ge 0.15$ over 7 days while canopy fever anomaly $\Delta T_{canopy} \ge +2.0^\circ\text{C}$.
  - **Warning / Emergency Alert:** $\Delta WSI_{7d} \ge 0.25$ over 7 days with $\Delta T_{canopy} \ge +3.5^\circ\text{C}$.
  - **Insufficient Data Behavior:** If historical observations for $t - 7\text{ days}$ do not exist, the alert status returns `active: false, status: "insufficient_time_series_data"`. It is never synthetically faked.

---

### 1.3 Honest Boundary on Subsoil Hardpan & Salinity Diagnoses
* **Prior Flaw:** `deriveFieldMemoryFromCoords()` diagnosed hardpan compaction based solely on a latitude/longitude bounding box.
* **The Correction:**
  Satellite thermal and radar data at 70m/9km **cannot directly diagnose subsoil mechanical compaction or deep chemical salinity** for a specific farm without in-situ ground testing or explicit farmer input.
  - The system provides a **Regional Geological & Soil Survey Risk Proxy** clearly labeled as such.
  - When the farmer completes the Agronomic Questionnaire (confirming deep plow history, drainage type, or subsoil issues), that input is recorded as `USER_INPUT` with high confidence.

---

## 2. Reconciled Biophysical Equations (1 to 20)

| Eq # | Name | Formulation | Primary Variables & Units | Physical Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Surface Energy Balance | $R_n = G + H + \lambda ET$ | $R_n, G, H, \lambda ET$ in $W/m^2$ | Conservation of radiative energy at canopy surface. |
| **2** | Net Solar Radiation | $R_n = (1 - \alpha) R_s + \epsilon_s \sigma (T_{air}^4 - T_s^4)$ | $\alpha$ [-], $R_s [W/m^2]$, $\sigma=5.67\times 10^{-8}$ | Net energy available after albedo and thermal radiation. |
| **3** | Sensible Heat Flux | $H = \rho c_p \frac{T_{canopy} - T_{air}}{r_{ah}}$ | $\rho=1.225 kg/m^3$, $c_p=1013 J/kg\cdot K$, $r_{ah} [s/m]$ | Heat conducted to air when transpiration slows down. |
| **4** | Latent Heat Flux | $\lambda ET = R_n - G - H$ | $\lambda=2.45 \times 10^6 J/kg$ | Energy consumed by water evaporation and transpiration. |
| **5** | Aerodynamic Resistance | $r_{ah} = \frac{\ln((z_m - d)/z_{0m})\ln((z_h - d)/z_{0h})}{k^2 u_z}$ | $k=0.41$, $u_z [m/s]$, $z_m, z_h [m]$ | Resistance of turbulent boundary layer above canopy. |
| **6** | Stomatal Resistance | $r_s = r_{s,min} [1 + e^{-\beta_1(\psi_l - \psi_{crit})}] f(VPD)$ | $r_s [s/m]$, $\psi_l [MPa]$, $VPD [kPa]$ | Leaf pore clamping under dry air and root water deficit. |
| **7** | Vapor Pressure Deficit | $VPD = e_s(T_{air}) - e_a$ | $e_s, e_a [kPa]$ | Atmospheric suction power pulling moisture from foliage. |
| **8** | Saturation Vapor Pressure | $e_s(T) = 0.6108 \exp(17.27 T / (T + 237.3))$ | $T [^\circ C]$, $e_s [kPa]$ | Tetens equation for maximum moisture air can hold. |
| **9** | Reference ET (FAO-56 PM) | $ET_0 = \frac{0.408 \Delta (R_n - G) + \gamma \frac{900}{T+273} u_2 VPD}{\Delta + \gamma(1 + 0.34 u_2)}$ | $ET_0 [mm/day]$, $\Delta, \gamma [kPa/^\circ C]$ | Standard evapotranspiration of reference grass. |
| **10**| Actual Crop ET | $ET_c = K_c \cdot K_s \cdot ET_0$ | $K_c, K_s [-]$, $ET_c [mm/day]$ | Crop-specific water consumption throttled by soil stress. |
| **11**| Water Stress Coefficient | $K_s = \frac{TAW - D_r}{TAW - RAW}$ | $TAW, RAW, D_r [mm]$ | FAO-56 moisture stress reduction below critical threshold. |
| **12**| Relative Evaporation Ratio | $r_{ET} = \frac{ET_a}{PET}$ | $r_{ET} [-]$ (0 to 1) | Instantaneous transpirational sufficiency fraction. |
| **13**| Canopy Fever Anomaly | $\Delta T_{fever} = T_{canopy} - (T_{air} + \Delta T_{baseline})$ | $\Delta T_{fever} [^\circ C]$ | Temperature excess above healthy evaporatively cooled leaf. |
| **14**| Flash Drought Velocity | $FDVI = \frac{\Delta WSI}{\Delta t}$ | $FDVI [day^{-1}]$ | Speed of drying rate indicating sudden flash drought. |
| **15**| Feddes Root Uptake | $S(z) = \alpha(h) S_{max}(z)$ | $S(z) [day^{-1}]$, $h [cm]$ | Depth-dependent root water extraction under pressure head. |
| **16**| Soil Retention Curve | $\Theta(h) = [1 + (\alpha \|h\|)^n]^{-m}$ | van Genuchten parameters | Soil moisture-suction relationship. |
| **17**| Subsoil Percolation Ratio | $\Xi = \frac{\Delta \theta_{surface}/\Delta t}{\Delta \theta_{rootzone}/\Delta t}$ | $\Xi [-]$ | Proxy ratio for percolation resistance across depth. |
| **18**| Osmotic Potential | $\pi_{os} = -0.036 \cdot EC_e$ | $\pi_{os} [MPa]$, $EC_e [dS/m]$ | Osmotic root impedance caused by soil salinity. |
| **19**| Dynamic TOPSIS Scoring | $C_i = \frac{D_i^-}{D_i^+ + D_i^-}$ | $C_i [-]$ (0 to 1) | Multi-criteria distance to ideal agronomic rotation. |
| **20**| Prescriptive Irrigation | $V_{irr} = \frac{(ET_c - P_{eff}) \times 4200.83}{1000 \times \eta_{irr} \times (1 - LF)}$ | $V_{irr} [m^3/feddan]$ | Depth and volume needed to replenish root zone in feddans. |
