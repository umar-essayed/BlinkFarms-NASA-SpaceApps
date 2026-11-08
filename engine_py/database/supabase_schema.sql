-- ==============================================================================
-- BlinkFarms — Supabase PostgreSQL & pgvector Definitive Schema
-- Hybrid Architecture: Relational Data + Spatial Polygons + Semantic Vector RAG
-- NASA Space Apps Challenge 2026: Adapting Farms with NASA Data
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 2. FARMS & PARCELS (بيانات الحقول والمزارع)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255),
    country VARCHAR(100) DEFAULT 'Egypt',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    polygon_geojson JSONB,              -- GeoJSON boundary of parcel
    clean_buffer_geojson JSONB,         -- Inward -30m buffer boundary
    area_ha DOUBLE PRECISION DEFAULT 10.0,
    soil_type VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. FIELD MEMORY STATES (ذاكرة الحقل تحت الأرض - F_state Vector)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_memory_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    carryover_water_fraction DOUBLE PRECISION DEFAULT 0.38,  -- Phi_carryover (SMAP L4 100cm)
    stress_frequency_36m DOUBLE PRECISION DEFAULT 0.42,       -- S_freq (fraction of days with ESI < 0.40)
    accumulated_heat_load DOUBLE PRECISION DEFAULT 1420.0,    -- H_accum in degree-days
    soil_error_index DOUBLE PRECISION DEFAULT 0.58,           -- Xi_soil_error (Closed-Loop Probing)
    hardpan_detected BOOLEAN DEFAULT TRUE,                    -- True if Xi < 0.70
    salinity_risk VARCHAR(50) DEFAULT 'moderate',             -- normal, moderate, severe
    previous_crop_id VARCHAR(50) DEFAULT 'maize',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. MASTER CROP CATALOG (كتالوج الـ 36+ محصولاً ومعاملات FAO-56 و EcoCrop)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crop_catalog (
    crop_id VARCHAR(50) PRIMARY KEY,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    botanical_family VARCHAR(50) NOT NULL,
    season VARCHAR(20) NOT NULL, -- summer, winter, perennial
    kc_ini DOUBLE PRECISION NOT NULL,
    kc_mid DOUBLE PRECISION NOT NULL,
    kc_end DOUBLE PRECISION NOT NULL,
    ky DOUBLE PRECISION NOT NULL,                 -- Stewart yield response to drought
    depletion_p DOUBLE PRECISION NOT NULL,        -- Easy extraction fraction
    root_depth_max_m DOUBLE PRECISION NOT NULL,   -- Zr,max
    t_base DOUBLE PRECISION NOT NULL,
    t_opt DOUBLE PRECISION NOT NULL,
    t_max DOUBLE PRECISION NOT NULL,
    gdd_maturity INTEGER NOT NULL,
    water_requirement_mm DOUBLE PRECISION NOT NULL,
    salinity_tolerance_ds_m DOUBLE PRECISION NOT NULL,
    nitrogen_fixation_kg_ha DOUBLE PRECISION NOT NULL, -- Positive for legumes (+180 kg/ha)
    residue_biomass_t_ha DOUBLE PRECISION NOT NULL,
    avg_cost_per_ha DOUBLE PRECISION NOT NULL,
    avg_revenue_per_ha DOUBLE PRECISION NOT NULL,
    market_liquidity VARCHAR(20) DEFAULT 'high'
);

-- ------------------------------------------------------------------------------
-- 5. SIMULATION & TOPSIS ROTATION PLANS (خطط الدورات لـ 3 سنوات)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rotation_simulation_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    strategy_id VARCHAR(50) NOT NULL,            -- 'balanced', 'water_saving', 'current'
    title_ar VARCHAR(255) NOT NULL,
    title_en VARCHAR(255) NOT NULL,
    year_1_crop_id VARCHAR(50) REFERENCES crop_catalog(crop_id),
    year_2_crop_id VARCHAR(50) REFERENCES crop_catalog(crop_id),
    year_3_crop_id VARCHAR(50) REFERENCES crop_catalog(crop_id),
    total_water_use_m3_ha DOUBLE PRECISION NOT NULL,
    total_water_saved_percent DOUBLE PRECISION NOT NULL,
    total_nitrogen_added_kg_ha DOUBLE PRECISION NOT NULL,
    avg_failure_risk_percent DOUBLE PRECISION NOT NULL,
    total_net_profit_usd_ha DOUBLE PRECISION NOT NULL,
    soil_health_index_score DOUBLE PRECISION NOT NULL,
    topsis_closeness DOUBLE PRECISION NOT NULL,  -- Ci in [0, 1]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. SEMANTIC AGRONOMIC KNOWLEDGE BASE (pgvector Embeddings for Farmer Chatbot)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agronomic_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'flash_drought', 'pest_cycles', 'soil_compaction', 'irrigation'
    content_ar TEXT NOT NULL,
    content_en TEXT NOT NULL,
    embedding vector(1536),          -- Compatible with OpenAI text-embedding-3 / Gemini 768/1536
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HNSW Vector Index for Instant Cosine Search (<=> operator)
CREATE INDEX IF NOT EXISTS agronomic_knowledge_embedding_hnsw_idx 
ON agronomic_knowledge 
USING hnsw (embedding vector_cosine_ops);

-- ------------------------------------------------------------------------------
-- 7. COSINE SIMILARITY RPC FUNCTION FOR SUPABASE CLIENTS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION match_agronomic_knowledge (
    query_embedding vector(1536),
    match_threshold DOUBLE PRECISION DEFAULT 0.65,
    match_count INT DEFAULT 4
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    category VARCHAR(100),
    content_ar TEXT,
    content_en TEXT,
    similarity DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        k.id,
        k.title,
        k.category,
        k.content_ar,
        k.content_en,
        1 - (k.embedding <=> query_embedding) AS similarity
    FROM agronomic_knowledge k
    WHERE 1 - (k.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. INITIAL PRESET SEED DATA FOR DEMO FARMS
-- ------------------------------------------------------------------------------
INSERT INTO farms (name, owner_name, country, latitude, longitude, area_ha, soil_type)
VALUES 
('AmeriFlux US-Ne1 Benchmark Field', 'University of Nebraska-Lincoln', 'USA', 41.165, -96.476, 65.0, 'Deep Silty Clay Loam'),
('حقل توشكى المستصلح (واحة صحراوية)', 'مشروع تنمية جنوب الوادي', 'Egypt', 22.684, 31.543, 120.0, 'Sandy Loam with Calcareous Hardpan'),
('أرض زراعية في المنيا (وادي النيل)', 'حقل عائلي بسمالوط', 'Egypt', 28.312, 30.714, 25.0, 'Alluvial Clay Loam')
ON CONFLICT DO NOTHING;
