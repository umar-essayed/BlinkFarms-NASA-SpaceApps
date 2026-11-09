# ==============================================================================
# BlinkFarms — NASA Earth Observation & Earthdata Live Ingestion Client
# Direct integration with NASA POWER REST API and NASA Earthdata Cloud (CMR / AppEEARS)
# NASA Space Apps Challenge 2026: Field Shift
# ==============================================================================

import os
import json
import math
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple

# Load credentials from environment with default production keys
NASA_API_KEY = os.environ.get("NASA_API_KEY", "CfJTjDCpHGhcjmj6zkzrPhzBRhjTCjTff9tjPRB9")
EARTHDATA_BEARER_TOKEN = os.environ.get(
    "EARTHDATA_BEARER_TOKEN",
    "eyJ0eXAiOiJKV1QiLCJvcmlnaW4iOiJFYXJ0aGRhdGEgTG9naW4iLCJzaWciOiJlZGxqd3RwdWJrZXlfb3BzIiwiYWxnIjoiUlMyNTYifQ.eyJ0eXBlIjoiVXNlciIsInVpZCI6InVtYXIuZXNzYXllZCIsInN1YiI6InVtYXIuZXNzYXllZCIsImV4cCI6MTc5OTQwODczMiwiaWF0IjoxNzk0MjI0NzMyLCJpc3MiOiJodHRwczovL3Vycy5lYXJ0aGRhdGEubmFzYS5nb3YiLCJpZGVudGl0eV9wcm92aWRlciI6ImVkbF9vcHMiLCJhY3IiOiJlZGwiLCJhc3N1cmFuY2VfbGV2ZWwiOjN9.4UcMIYjm8hTzT6KvnpT7D32h3nMR-4fw6p5MrfepIpCHKDwkyxOewdC9yI8GbXsjotVnX3-qeNLbq2i4G8D_Ke6ZkswQq6QpS8mrdOo0yDs2DBUL6E69Mj-g4JzdAAIEodJndpaUA7xGxPppHZmOVpMgKijeo2Nby-WyhoYBx81XgkIuVePUQEVtWlngxtOZPfqP_iM_7-14tsnMp4SH-Ov348fM1loruWgG4BxtCGsvsKDlCJEwkswRaqeuilGigWDp7jHqiDYBqJdZc6vJTf86WeXGBNhabel20kvpEx_0dQNiWJWb3gyfzveLYd2FBmwWNA_NdtboTx-lNbacyA"
)
NASA_POWER_API_BASE = os.environ.get("NASA_POWER_API_BASE", "https://power.larc.nasa.gov/api/temporal/daily/point")
APPEEARS_API_BASE = os.environ.get("APPEEARS_API_BASE", "https://appeears.earthdatacloud.nasa.gov/api")
CMR_GRANULES_URL = "https://cmr.earthdata.nasa.gov/search/granules.json"

# In-memory cache for NASA POWER observations (key: "lat_lon_date")
_POWER_CACHE: Dict[str, Dict[str, Any]] = {}

def fetch_nasa_power_live(
    lat: float,
    lon: float,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    timeout_sec: float = 12.0
) -> Dict[str, Any]:
    """
    Fetches real-time daily meteorological parameters from NASA POWER API:
    - T2M, T2M_MAX, T2M_MIN (Air Temperature at 2m, °C)
    - RH2M (Relative Humidity at 2m, %)
    - WS2M (Wind Speed at 2m, m/s)
    - ALLSKY_SFC_SW_DWN (All-Sky Solar Insolation, MJ/m^2/day)
    - PRECTOTCORR (Precipitation Corrected, mm/day)
    """
    valid_lat = max(-90.0, min(90.0, lat))
    valid_lon = max(-180.0, min(180.0, lon))

    now = datetime.utcnow()
    if end_date is None:
        # NASA POWER MERRA-2 daily assimilation latency is ~3-5 days
        end_dt = now - timedelta(days=4)
        end_date = end_dt.strftime("%Y%m%d")
    if start_date is None:
        start_dt = datetime.strptime(end_date, "%Y%m%d") - timedelta(days=7)
        start_date = start_dt.strftime("%Y%m%d")

    cache_key = f"{valid_lat:.3f}_{valid_lon:.3f}_{start_date}_{end_date}"
    if cache_key in _POWER_CACHE:
        return _POWER_CACHE[cache_key]

    params = "T2M,T2M_MAX,T2M_MIN,RH2M,ALLSKY_SFC_SW_DWN,WS2M,PRECTOTCORR"
    url = (
        f"{NASA_POWER_API_BASE}?parameters={params}&community=AG"
        f"&longitude={valid_lon:.4f}&latitude={valid_lat:.4f}"
        f"&start={start_date}&end={end_date}&format=JSON"
        f"&api_key={NASA_API_KEY}"
    )

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "BlinkFarms-NASA-SpaceApps/2.1 (Biophysical Engine)",
            "Accept": "application/json"
        }
    )

    with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
        if resp.status != 200:
            raise RuntimeError(f"NASA POWER API returned HTTP {resp.status}")
        raw_body = resp.read().decode("utf-8")
        data = json.loads(raw_body)

    properties = data.get("properties", {})
    parameters = properties.get("parameter", {})
    if not parameters or "T2M" not in parameters:
        raise ValueError(f"NASA POWER API returned invalid payload structure: {list(data.keys())}")

    # Extract the most recent valid observation day
    t2m_series = parameters.get("T2M", {})
    valid_dates = [d for d, val in t2m_series.items() if val > -900.0]
    if not valid_dates:
        raise ValueError("No valid non-fill observation days in NASA POWER response")

    latest_date = sorted(valid_dates)[-1]
    
    t_mean = float(parameters["T2M"][latest_date])
    t_max = float(parameters.get("T2M_MAX", {}).get(latest_date, t_mean + 5.0))
    t_min = float(parameters.get("T2M_MIN", {}).get(latest_date, t_mean - 5.0))
    rh = float(parameters.get("RH2M", {}).get(latest_date, 45.0))
    ws = float(parameters.get("WS2M", {}).get(latest_date, 2.5))
    sw_mj = float(parameters.get("ALLSKY_SFC_SW_DWN", {}).get(latest_date, 20.0))
    precip = float(parameters.get("PRECTOTCORR", {}).get(latest_date, 0.0))

    # Guard against negative fill values in radiation or wind
    if sw_mj < 0:
        sw_mj = 20.0
    if ws < 0:
        ws = 2.0
    if precip < 0:
        precip = 0.0

    result = {
        "status": "LIVE",
        "source": "NASA POWER (MERRA-2 / GEOS-FP)",
        "source_url": url,
        "observation_date": latest_date,
        "latitude": valid_lat,
        "longitude": valid_lon,
        "t_air_mean": t_mean,
        "t_air_max": t_max,
        "t_air_min": t_min,
        "rh_pct": rh,
        "wind_speed_ms": ws,
        "solar_rad_mj_m2_day": sw_mj,
        "solar_rad_wm2": (sw_mj * 1e6) / 86400.0,
        "precip_mm_day": precip,
        "history_dates": valid_dates,
        "history_t2m": [parameters["T2M"][d] for d in sorted(valid_dates)],
        "history_rh2m": [parameters.get("RH2M", {}).get(d, rh) for d in sorted(valid_dates)]
    }

    _POWER_CACHE[cache_key] = result
    return result

def compute_live_biophysical_atmosphere(weather: Dict[str, Any], elevation_m: float = 20.0) -> Dict[str, float]:
    """
    Computes micrometeorological and thermodynamic parameters from live NASA observations:
    - Saturated & actual vapor pressure (e_s, e_a, VPD) in kPa
    - Slope of vapor pressure curve (Delta) in kPa/°C
    - Psychrometric constant (gamma) in kPa/°C
    - Net radiation (R_n) in W/m^2 and MJ/m^2/day
    - Reference Evapotranspiration (ET_0) via standard FAO-56 Penman-Monteith
    """
    t_mean = weather["t_air_mean"]
    t_max = weather["t_air_max"]
    t_min = weather["t_air_min"]
    rh = weather["rh_pct"]
    u2 = weather["wind_speed_ms"]
    rs_mj = weather["solar_rad_mj_m2_day"]  # MJ/m^2/day

    # 1. Saturated Vapor Pressure e_s(T) (Tetens / FAO-56 Eq 11-12)
    es_tmax = 0.6108 * math.exp((17.27 * t_max) / (t_max + 237.3))
    es_tmin = 0.6108 * math.exp((17.27 * t_min) / (t_min + 237.3))
    es = (es_tmax + es_tmin) / 2.0  # kPa

    # 2. Actual Vapor Pressure e_a (FAO-56 Eq 17)
    ea = es * (max(1.0, min(100.0, rh)) / 100.0)

    # 3. Vapor Pressure Deficit (VPD)
    vpd = max(0.01, es - ea)

    # 4. Slope of Saturation Vapor Pressure Curve Delta (FAO-56 Eq 13)
    delta_slope = (4098.0 * (0.6108 * math.exp((17.27 * t_mean) / (t_mean + 237.3)))) / ((t_mean + 237.3) ** 2)

    # 5. Atmospheric Pressure P and Psychrometric Constant gamma (FAO-56 Eq 7-8)
    p_atm = 101.3 * math.pow((293.0 - 0.0065 * elevation_m) / 293.0, 5.26)
    gamma_psy = 0.000665 * p_atm  # ~0.066 kPa/°C

    # 6. Net Radiation R_n (FAO-56 Eq 37-40)
    # Albedo alpha ~ 0.23 for standard green crop
    albedo = 0.23
    r_ns = (1.0 - albedo) * rs_mj  # Shortwave net radiation in MJ/m^2/day

    # Net outgoing longwave radiation R_nl
    # Stefan-Boltzmann constant sigma_sb = 4.903e-9 MJ/(K^4 m^2 day)
    sigma_sb = 4.903e-9
    t_max_k4 = (t_max + 273.16) ** 4
    t_min_k4 = (t_min + 273.16) ** 4
    # Clear-sky solar radiation R_so approximation
    lat_rad = math.radians(weather.get("latitude", 30.0))
    # Relative solar distance and solar declination
    doy = datetime.strptime(weather.get("observation_date", "20260701"), "%Y%m%d").timetuple().tm_yday
    dr = 1.0 + 0.033 * math.cos(2.0 * math.pi * doy / 365.0)
    delta_dec = 0.409 * math.sin((2.0 * math.pi * doy / 365.0) - 1.39)
    omega_s = math.acos(max(-1.0, min(1.0, -math.tan(lat_rad) * math.tan(delta_dec))))
    ra_mj = (24.0 * 60.0 / math.pi) * 0.0820 * dr * (
        omega_s * math.sin(lat_rad) * math.sin(delta_dec) +
        math.cos(lat_rad) * math.cos(delta_dec) * math.sin(omega_s)
    )
    r_so = (0.75 + 2e-5 * elevation_m) * ra_mj
    f_cloud = min(1.0, max(0.3, rs_mj / max(0.1, r_so)))

    r_nl = sigma_sb * ((t_max_k4 + t_min_k4) / 2.0) * (0.34 - 0.14 * math.sqrt(max(0.0, ea))) * (1.35 * f_cloud - 0.35)
    r_nl = max(0.0, r_nl)

    # Net radiation R_n (MJ/m^2/day)
    r_n_mj = max(1.0, r_ns - r_nl)
    # Convert to average daytime Flux (W/m^2)
    r_net_wm2 = (r_n_mj * 1e6) / 86400.0

    # Soil heat flux G ~ 0 for daily time-steps (FAO-56 Eq 42)
    g_flux_mj = 0.0

    # 7. Reference Evapotranspiration ET_0 (FAO-56 Penman-Monteith Eq 6)
    # ET0 = (0.408 * Delta * (Rn - G) + gamma * (900 / (T + 273)) * u2 * (es - ea)) / (Delta + gamma * (1 + 0.34 * u2))
    num_rad = 0.408 * delta_slope * (r_n_mj - g_flux_mj)
    num_aero = gamma_psy * (900.0 / (t_mean + 273.16)) * u2 * (es - ea)
    den = delta_slope + gamma_psy * (1.0 + 0.34 * u2)
    et0_mm_day = max(0.2, (num_rad + num_aero) / den)

    return {
        "es_kpa": float(round(es, 3)),
        "ea_kpa": float(round(ea, 3)),
        "vpd_kpa": float(round(vpd, 3)),
        "delta_kpa_c": float(round(delta_slope, 4)),
        "gamma_kpa_c": float(round(gamma_psy, 4)),
        "r_net_mj_m2_day": float(round(r_n_mj, 2)),
        "r_net_wm2": float(round(r_net_wm2, 1)),
        "et0_mm_day": float(round(et0_mm_day, 2))
    }

def verify_earthdata_token(timeout_sec: float = 10.0) -> Dict[str, Any]:
    """
    Verifies the production NASA Earthdata Bearer Token against NASA's CMR API
    (Common Metadata Repository for SMAP, ECOSTRESS, Landsat, and LP DAAC).
    """
    req = urllib.request.Request(
        f"{CMR_GRANULES_URL}?short_name=SPL4SMAU&page_size=1",
        headers={
            "Authorization": f"Bearer {EARTHDATA_BEARER_TOKEN}",
            "User-Agent": "BlinkFarms-NASA-SpaceApps/2.1 (Earthdata Client)",
            "Accept": "application/json"
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            status_code = resp.status
            body = json.loads(resp.read().decode("utf-8"))
            feed = body.get("feed", {})
            entry_count = len(feed.get("entry", []))
            granule_id = feed["entry"][0].get("id") if entry_count > 0 else None
            return {
                "authenticated": status_code == 200,
                "status_code": status_code,
                "provider": "NASA Earthdata Cloud (CMR)",
                "collection": "SMAP L4 Global 9km Surface/Root-Zone Soil Moisture (SPL4SMAU)",
                "sample_granule_id": granule_id,
                "token_valid": True
            }
    except urllib.error.HTTPError as he:
        return {
            "authenticated": False,
            "status_code": he.code,
            "error": str(he),
            "token_valid": False
        }
    except Exception as e:
        return {
            "authenticated": False,
            "error": str(e),
            "token_valid": False
        }
