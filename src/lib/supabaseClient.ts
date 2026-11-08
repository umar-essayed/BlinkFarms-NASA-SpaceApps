// ==============================================================================
// BlinkFarms — Supabase TypeScript Client (Frontend & API Routes)
// Relational Tables + pgvector Similarity Functions
// ==============================================================================

import { createClient } from '@supabase/supabase-js';

export interface FarmRecord {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  area_ha: number;
  soil_type: string;
}

export interface FieldMemoryRecord {
  id: string;
  farm_id: string;
  carryover_water_fraction: number;
  stress_frequency_36m: number;
  accumulated_heat_load: number;
  soil_error_index: number;
  hardpan_detected: boolean;
  salinity_risk: string;
  previous_crop_id: string;
}

// Environment keys (strictly from environment variables)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Official Supabase JS Client for Auth & Database operations
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Searches the semantic vector knowledge base via Supabase Edge / RPC
 */
export async function searchSemanticKnowledge(query: string, lang: 'ar' | 'en' = 'ar'): Promise<string[]> {
  if (!isSupabaseConfigured) {
    // Local fallback knowledge
    if (query.includes('أروي') || query.includes('irrigate')) {
      return [
        lang === 'ar'
          ? 'المسبار العكسي يؤكد أن الري السريع يكسر حمى النبات ويغذي منطقة الجذور العميقة قبل تفاقم الجفاف.'
          : 'Closed-loop probing confirms prompt irrigation quenches canopy fever and hydrates the 100cm root zone.'
      ];
    }
    return [
      lang === 'ar'
        ? 'الدورات البقولية تثبت النيتروجين الحيوي وتوفر حتى 35% من استهلاك المياه الموسمي.'
        : 'Leguminous rotation breaks pest cycles, replenishes organic nitrogen, and reduces seasonal water demand by up to 35%.'
    ];
  }

  try {
    // If Supabase is active, call the RPC vector search endpoint
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_agronomic_knowledge`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        match_threshold: 0.65,
        match_count: 3
      })
    });
    const data = await res.json();
    return data.map((d: any) => lang === 'ar' ? d.content_ar : d.content_en);
  } catch (err) {
    console.warn('Vector search fallback:', err);
    return [];
  }
}
