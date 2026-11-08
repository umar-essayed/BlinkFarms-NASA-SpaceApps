# BlinkFarms — FieldShift Multi-Seasonal Adaptation & Rotation Engine Specification
**NASA Space Apps Challenge 2026 — Challenge 7: Field Shift**

---

## 1. Executive Summary & Purpose

The **FieldShift Adaptation Engine** transitions agricultural planning from static monoculture or fixed crop templates to an agro-ecologically bounded, dynamic multi-year crop sequence optimizer. Grounded in **FAO-56 Dual Crop Coefficient Water Balance**, **Stewart Yield Response Modeling**, and **NASA Earth Observations** (SMAP subsoil moisture, ECOSTRESS evaporative stress, NASA POWER agroclimatology), FieldShift dynamically evaluates thousands of potential rotation sequences and ranks them using multi-criteria **TOPSIS (Technique for Order Preference by Similarity to Ideal Solution)**.

---

## 2. Agro-Ecological Filtering & Bounding

Given field coordinates $(\phi, \lambda)$ and derived NASA POWER 30-year agroclimatological envelopes, crops are filtered against physiological thresholds before sequence candidate generation:

```
               [ 30+ Crops Master Knowledge Base (FAO-56 / EcoCrop) ]
                                      │
                                      ▼
                  ┌───────────────────────────────────────┐
                  │ 1. Latitude / Climate Envelope Filter │
                  │    • MENA Arid (18°-34°N, -15°-55°E)  │
                  │    • Mediterranean (31°-44°N)         │
                  │    • Temperate US (35°-50°N)          │
                  └───────────────────┬───────────────────┘
                                      ▼
                  ┌───────────────────────────────────────┐
                  │ 2. Salinity Tolerance Threshold Filter│
                  │    Crop EC_e >= Field Soil Salinity   │
                  └───────────────────┬───────────────────┘
                                      ▼
                  ┌───────────────────────────────────────┐
                  │ 3. Thermal Feasibility Filter         │
                  │    GDD_accumulated >= GDD_maturity    │
                  └───────────────────┬───────────────────┘
                                      ▼
                  [ Feasible Crop Pool for Farm Location ]
```

### 2.1 Geographic & Climate Envelopes
- **MENA Arid / Nile Basin / Desert Reclamation ($18^\circ - 34^\circ \text{N}, -15^\circ - 55^\circ \text{E}$)**:
  - High evaporative demand ($PET \approx 1400 - 2200\text{ mm/yr}$).
  - Dominant crops: Berseem clover (*Trifolium alexandrinum*), Durum wheat (*Triticum durum*), Grain sorghum (*Sorghum bicolor*), Panicum forage (*Panicum virgatum*), Faba bean (*Vicia faba*), Sunflower (*Helianthus annuus*), Sesame, Barley.
- **Mediterranean Basin ($31^\circ - 44^\circ \text{N}, -10^\circ - 36^\circ \text{E}$)**:
  - Winter rainfed/supplemented; hot dry summers.
  - Dominant crops: Chickpea, Lentil, Durum wheat, Safflower, Olive, Faba bean.
- **Temperate Corn Belt ($35^\circ - 50^\circ \text{N}, -125^\circ - -70^\circ \text{W}$)**:
  - Deep mollisols, freezing winters, humid summers.
  - Dominant crops: Soybean, Maize, Winter wheat, Alfalfa, Oats.

### 2.2 Soil Constraints & Salinity Screening
- If `fieldMemory.salinityRiskLevel === 'severe'` ($EC_e \ge 6.0\text{ dS/m}$):
  - Eligible crops are strictly bounded to halotolerant species: Barley ($EC_e=8.0$), Sorghum ($6.8$), Panicum ($8.0$), Sugar Beet ($7.0$), Safflower ($7.0$).
- If `fieldMemory.salinityRiskLevel === 'moderate'` ($EC_e \ge 4.0\text{ dS/m}$):
  - Requires $EC_e \ge 4.0\text{ dS/m}$ (e.g. Durum wheat, Sunflower, Cotton).

---

## 3. Sequence Generation & Agronomic Rotation Constraints

Candidate 3-year sequences $(C_1, C_2, C_3)$ are generated from the feasible crop pool subject to four agronomic rules:

### Rule 1: Botanical Family Succession (Pest & Pathogen Break)
- Continuous planting of the same family compounds soilborne pathogens (e.g., *Fusarium*, *Rhizoctonia*, cyst nematodes):
  $$\text{Family}(C_{t+1}) \neq \text{Family}(C_t)$$
  Specifically:
  - Poaceae (Maize, Wheat, Sorghum, Barley) cannot follow Poaceae unless separated or unavoidable.
  - Solanaceae (Tomato, Potato) can *never* follow Solanaceae within 3 seasons.
  - Fabaceae (Legumes) should alternate with nutrient-demanding grass crops.

### Rule 2: Obligate Biological Nitrogen Fixation
- Over a 3-year cycle, at least one year must feature an $N_2$-fixing legume ($N_{\text{fix}} > 0\text{ kg N/ha}$, e.g. Berseem clover $+160\text{ kg/ha}$, Faba bean $+95\text{ kg/ha}$, Alfalfa $+220\text{ kg/ha}$, Soybean $+65\text{ kg/ha}$).
- This biological nitrogen credit reduces synthetic nitrogen fertilizer application in year $t+1$ by:
  $$N_{\text{credit}, t+1} = \min(80, 0.40 \times N_{\text{fix}, t})\text{ kg N/ha}$$

### Rule 3: Subsoil Compaction & Bio-Drilling Remediation
- When `fieldMemory.hardpanDetected === true` (identified via closed-loop hydraulic probing $\xi_{\text{soil\_error}} < 0.70$ at $\sim 45\text{ cm}$):
  - The rotation must incorporate at least one deep taproot species ($Z_{r,\max} \ge 1.6\text{ m}$) in Year 1 or Year 2 (Alfalfa $2.0\text{ m}$, Sunflower $1.8\text{ m}$, Safflower $1.8\text{ m}$, Panicum $1.8\text{ m}$).
  - Bio-drilling taproots perforate the plow pan, restoring gravity drainage, capillary recharge, and root elongation for subsequent crops.

### Rule 4: Seasonal Water Budget Feasibility
- Sequences where total 3-year irrigation requirement exceeds regional sustainable water allocation are penalized or rejected:
  $$\sum_{t=1}^3 W_{t} \le W_{\text{quota\_max}}$$

---

## 4. Biophysical Scoring Formulation

Every candidate sequence is evaluated dynamically through four deterministic objective functions:

### 4.1 Water Consumption & Savings
- Seasonal water requirement per hectare:
  $$W_{t} = \text{waterRequirementMm}_t \times 10 \quad [\text{m}^3/\text{ha}]$$
- In Egyptian Feddans ($1\text{ feddan} = 4,200\text{ m}^2 = 0.42\text{ ha}$):
  $$W_{\text{feddan}, t} = \text{waterRequirementMm}_t \times 4.2 \quad [\text{m}^3/\text{feddan}]$$
- Water savings relative to continuous baseline monoculture:
  $$\Delta W_{\text{saved}} = \frac{W_{\text{baseline, 3yr}} - \sum_{t=1}^3 W_t}{W_{\text{baseline, 3yr}}} \times 100\%$$

### 4.2 Dynamic Yield Ratio & Stress Penalty
For each year $t$, predicted yield ratio $Y_a / Y_m$ is computed using the **Stewart Yield-Water Response Equation**:
$$1 - \frac{Y_{a,t}}{Y_{m,t}} = k_{y,t} \left(1 - \frac{ET_{a,t}}{ET_{c,t}}\right)$$
Adjusted for agronomic rotation effects:
$$\left(\frac{Y_a}{Y_m}\right)_t = \text{clamp}\left(1.0 - k_{y,t} \cdot \text{Deficit}_t + \text{Bonus}_{\text{legume}} + \text{Bonus}_{\text{biodrill}} - \text{Penalty}_{\text{monoculture}} - \text{Penalty}_{\text{salinity}}, 0.35, 1.0\right)$$
Where:
- $\text{Bonus}_{\text{legume}} = +0.06$ if crop $t-1$ was a legume.
- $\text{Bonus}_{\text{biodrill}} = +0.05$ if hardpan remediated in prior year.
- $\text{Penalty}_{\text{monoculture}} = 0.12 \times (\text{consecutive years of same crop} - 1)$.
- $\text{Penalty}_{\text{salinity}} = \max\left(0, 0.10 \times \left(\text{EC}_{\text{soil}} - \text{EC}_{\text{threshold}}\right)\right)$.

### 4.3 Net Financial Margin
Net income across the 3-year sequence:
$$\text{NetProfit} = \sum_{t=1}^3 \left( \text{avgRevenue}_t \times \left(\frac{Y_a}{Y_m}\right)_t - \text{avgCost}_t + \text{FertilizerSavings}_t \right)$$
Where $\text{FertilizerSavings}_t = N_{\text{credit}, t} \times \$1.20/\text{kg N}$.

### 4.4 Failure Risk Probability $P(\text{Yield} < 70\%)$
Failure risk is dynamically determined from crop drought vulnerability ($k_y$), allowable depletion ($p$), subsoil carryover moisture ($\Phi_{\text{carryover}}$), and 36-month satellite stress frequency ($S_{\text{freq}}$):
$$\text{Risk}_t = \text{clamp}\left( \text{BaseRisk} \times \frac{k_{y,t}}{1.0} \times (1.2 - p_t) \times (1 + \text{SalinityPenalty}) + \text{MonocultureCompounding}, 4\%, 92\% \right)$$

### 4.5 Multi-Factor Soil Health Index (0 - 100)
$$\text{SHI} = \text{clamp}\left( 50 + \frac{\sum N_{\text{fix}}}{6} + \frac{\sum \text{Biomass}}{0.6} + 10 \cdot (\text{Diversity}) + \text{BioDrillBonus} - \text{MonoPenalty}, 10, 100 \right)$$

---

## 5. Dynamic Multi-Objective TOPSIS Ranking

Candidate sequences and the baseline monoculture are ranked through TOPSIS across 4 criteria:
$$\mathbf{X} = \begin{bmatrix}
\text{Profit}_1 & \text{WaterSaved}_1 & \text{SHI}_1 & \text{Risk}_1 \\
\text{Profit}_2 & \text{WaterSaved}_2 & \text{SHI}_2 & \text{Risk}_2 \\
\vdots & \vdots & \vdots & \vdots \\
\text{Profit}_m & \text{WaterSaved}_m & \text{SHI}_m & \text{Risk}_m
\end{bmatrix}$$

- **Criteria Directions**: $[+ \text{Benefit}, + \text{Benefit}, + \text{Benefit}, - \text{Cost}]$.
- **User Preference Weights**: $\mathbf{w} = [w_{\text{profit}}, w_{\text{water}}, w_{\text{soil}}, w_{\text{climate}}]$, normalized $\sum w_j = 1$.
- **Euclidean Separation**:
  $$d_i^+ = \sqrt{\sum_{j=1}^4 (v_{ij} - a_j^+)^2}, \quad d_i^- = \sqrt{\sum_{j=1}^4 (v_{ij} - a_j^-)^2}$$
- **Relative Closeness Index**:
  $$C_i = \frac{d_i^-}{d_i^+ + d_i^-} \in [0.0, 1.0]$$

---

## 6. What-If Scenario Sensitivity Testing

FieldShift allows farmers and agronomists to perturb boundary conditions dynamically:
1. **Water Quota Cut (-10% to -30%)**: Re-evaluates all rotations under deficit irrigation; ultra-drought-hardy species (Sorghum, Panicum, Barley) surge in TOPSIS rank.
2. **Prioritizing Immediate Profit vs Long-Term Soil Health**: Adjusts $\mathbf{w}$ dynamically, demonstrating the trade-off curve between immediate cash crop extraction and multi-year fertility preservation.
3. **Subsoil Remediation Validation**: Demonstrates how bio-drilling taproots restore yield potential across subsequent winter wheat crops.

---

## 7. Next-Gen Biophysical Upgrade: FAO AquaCrop & DSSAT Sequence Analysis

### 7.1 Equation 21: NASA POWER Thermal Time & Growing Degree Days ($GDD$)
$$GDD_t = \max\left(0, \frac{T_{\max, t} + T_{\min, t}}{2} - T_{\text{base}}\right)$$
Phenological progression and maturity require $\sum_{t=1}^{\text{duration}} GDD_t \ge GDD_{\text{req}}$.

### 7.2 Equation 22: FAO AquaCrop Water Productivity Biomass Model
AquaCrop partitions cumulative actual transpiration $T_a$ into total above-ground dry biomass $B$:
$$B = WP^* \times \sum_{t=1}^{\text{duration}} \left( \frac{T_{a, t}}{ET_{0, t}} \right)$$
Where $WP^*$ is the climate-normalized crop water productivity ($15 - 20\text{ g/m}^2$ for C3 crops, $30 - 35\text{ g/m}^2$ for C4 crops).

### 7.3 Equation 23: Anthesis Heat-Shock & Harvest Index Sterilization
Harvestable yield $Y = B \times HI_{\text{adj}}$, where actual harvest index is penalized if temperatures exceed crop-specific critical flowering thresholds ($T_{\text{crit,flowering}}$):
$$f_{\text{heat}} = \max\left(0.15, 1.0 - 0.09 \cdot \sum \max(0, T_{\max} - T_{\text{crit}})\right)$$
$$HI_{\text{adj}} = HI_0 \times f_{\text{heat}}$$

### 7.4 DSSAT 6-Season (3-Year) Dynamic Soil State Carryover
The rotation engine operates across 6 discrete Egyptian agro-climatic seasons (Winter $\to$ Summer $\to$ Winter $\to$ Summer $\to$ Winter $\to$ Summer):
1. **Biological Nitrogen Credit**: A legume in season $t$ fixes $N_{\text{fix}}$, of which $75\%$ is biologically available as residual soil organic nitrate for the subsequent cereal crop:
   $$N_{\text{credit}, t+1} = \min(85, 0.75 \times N_{\text{fix}, t})\text{ kg N/ha}$$
   This translates directly to saved 50kg Urea bags for Egyptian farmers:
   $$\text{Bags Saved} = \frac{N_{\text{credit}} \times 0.42}{0.46 \times 50} \approx \frac{N_{\text{credit}}}{54.76}\quad [\text{bags/feddan}]$$
2. **Subsoil Hardpan Bio-Drilling**: Deep taproot crops ($Z_{r,\max} \ge 1.6\text{ m}$) reduce compaction score by 60%, unlocking soil water storage for subsequent shallow-rooted crops.
3. **Soil Moisture & Salinity Carryover**: High water-demand crops deplete deep profile storage $\Phi_{\text{subsoil}}$, while salt-tolerant crops facilitate profile flushing.
