import os
import json
import re
import urllib.request

def seed_database():
    url = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")
    key = os.getenv("SUPABASE_KEY", "")

    # Read crop database typescript file
    base_dir = os.path.dirname(os.path.abspath(__file__))
    ts_file = os.path.join(base_dir, "..", "..", "src", "lib", "cropDatabase.ts")
    
    with open(ts_file, "r", encoding="utf-8") as f:
        content = f.read()

    # Extract all crop definitions
    crop_matches = re.finditer(r"(\w+):\s*\{\s*id:\s*['\"](\w+)['\"],(.*?)(?=\n  \w+:\s*\{|\n\};)", content, re.DOTALL)

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    rows = []
    for m in crop_matches:
        cid = m.group(2)
        body = m.group(3)

        def extract(pattern, default=""):
            found = re.search(pattern, body)
            return found.group(1).strip() if found else default

        row = {
            "crop_id": cid,
            "name_ar": extract(r"nameAr:\s*['\"]([^'\"]+)['\"]"),
            "name_en": extract(r"nameEn:\s*['\"]([^'\"]+)['\"]"),
            "botanical_family": extract(r"family:\s*['\"]([^'\"]+)['\"]", "poaceae"),
            "season": extract(r"season:\s*['\"]([^'\"]+)['\"]", "summer"),
            "kc_ini": float(extract(r"kcIni:\s*([0-9.]+)", 0.40)),
            "kc_mid": float(extract(r"kcMid:\s*([0-9.]+)", 1.15)),
            "kc_end": float(extract(r"kcEnd:\s*([0-9.]+)", 0.45)),
            "ky": float(extract(r"ky:\s*([0-9.]+)", 0.85)),
            "depletion_p": float(extract(r"depletionP:\s*([0-9.]+)", 0.55)),
            "root_depth_max_m": float(extract(r"rootDepthMaxM:\s*([0-9.]+)", 1.2)),
            "gdd_maturity": int(extract(r"gddMaturity:\s*([0-9]+)", 1300)),
            "salinity_tolerance_ds_m": float(extract(r"salinityToleranceDsM:\s*([0-9.]+)", 4.0)),
            "nitrogen_fixation_kg_ha": float(extract(r"nitrogenFixationKgHa:\s*([0-9.-]+)", 0)),
            "residue_biomass_t_ha": float(extract(r"residueBiomassTonHa:\s*([0-9.]+)", 3.5)),
            "avg_cost_per_ha": float(extract(r"avgCostPerHa:\s*([0-9.]+)", 700)),
            "avg_revenue_per_ha": float(extract(r"avgRevenuePerHa:\s*([0-9.]+)", 1500)),
            "water_requirement_mm": float(extract(r"waterRequirementMm:\s*([0-9.]+)", 450)),
            "t_base": float(extract(r"tBase:\s*([0-9.]+)", 10.0)),
            "t_opt": float(extract(r"tOpt:\s*([0-9.]+)", 25.0)),
            "t_max": float(extract(r"tMax:\s*([0-9.]+)", 36.0)),
            "market_liquidity": extract(r"marketLiquidity:\s*['\"]([^'\"]+)['\"]", "high")
        }
        rows.append(row)

    print(f"Parsed {len(rows)} crops from knowledge base.")

    # Insert crops into crop_catalog
    if rows:
        req = urllib.request.Request(
            f"{url}/rest/v1/crop_catalog",
            data=json.dumps(rows).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as resp:
                print(f" Successfully upserted {len(rows)} crops to Supabase crop_catalog! HTTP {resp.status}")
        except Exception as e:
            print(f"Error seeding crops: {e}")
            if hasattr(e, "read"):
                print(e.read().decode("utf-8"))

    # Also seed initial Semantic Agronomic Knowledge Vectors for the Chatbot
    knowledge_entries = [
        {
            "title": "Flash Drought Fever Detection",
            "category": "flash_drought",
            "content_ar": "الجفاف الومضي يبدأ بحمى نباتية وإغلاق الثغور قبل ظهور أي اصفرار بـ 14 يوماً. يجب الري الفوري بكمية تعوض عجز منطقة الجذور.",
            "content_en": "Flash droughts manifest as stomatal closure and thermal fever up to 14 days before visible chlorophyll breakdown.",
            "metadata": {"source": "NASA ECOSTRESS & PT-JPL"}
        },
        {
            "title": "Subsoil Hardpan and Soil Error",
            "category": "soil_compaction",
            "content_ar": "إذا كان معامل خطأ التربة أقل من 0.70 بعد 48 ساعة من الري، فهذا يعني وجود طبقة صماء أو ملوحة تمنع الجذور من الامتصاص.",
            "content_en": "If soil error index is under 0.70 post 48h irrigation, a restrictive hardpan or saline layer is present.",
            "metadata": {"source": "Closed-Loop Probing Formula"}
        },
        {
            "title": "Biological Nitrogen Fixation with Legumes",
            "category": "crop_rotation",
            "content_ar": "زراعة فول الصويا أو البرسيم تثبت ما بين 80 إلى 180 كغ نيتروجين عضوي للهكتار، مما يوفر 30% من تكلفة الأسمدة ويوفر المياه.",
            "content_en": "Integrating legumes into rotations fixes 80 to 180 kg N/ha and significantly reduces chemical fertilizer and water requirements.",
            "metadata": {"source": "FAO-56 & USDA NRCS"}
        }
    ]

    req_k = urllib.request.Request(
        f"{url}/rest/v1/agronomic_knowledge",
        data=json.dumps(knowledge_entries).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    try:
        with urllib.request.urlopen(req_k) as resp:
            print(f" Successfully seeded agronomic knowledge to Supabase! HTTP {resp.status}")
    except Exception as e:
        print(f"Knowledge seeding note: {e}")

if __name__ == "__main__":
    seed_database()
