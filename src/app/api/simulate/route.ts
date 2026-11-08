import { NextResponse } from 'next/server';
import { simulateRotationStrategies, DEFAULT_PRIORITIES } from '@/lib/fieldShiftEngine';
import { deriveFieldMemoryFromCoords } from '@/lib/veloceRootEngine';
import { FieldMemoryState } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const priorities = body.priorities || DEFAULT_PRIORITIES;
    const lat = typeof body.lat === 'number' ? body.lat : 30.850;
    const lon = typeof body.lon === 'number' ? body.lon : 31.050;
    
    // Auto-derive 10-year field memory if not supplied
    const memory: FieldMemoryState = body.memory || deriveFieldMemoryFromCoords(lat, lon);

    // Optional integration probe with FastAPI microservice (port 8000)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);

      const pyRes = await fetch('http://127.0.0.1:8000/api/v1/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lon,
          priorities,
          field_memory: memory,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (pyRes.ok) {
        const pyData = await pyRes.json();
        if (pyData?.strategies && pyData.strategies.length > 0) {
          // Microservice active and returned strategies
          return NextResponse.json({
            success: true,
            source: 'python_microservice',
            strategies: pyData.strategies,
          });
        }
      }
    } catch (_err) {
      // Microservice idle or starting; proceed to local TypeScript engine
    }

    // High-performance local biophysical engine
    const strategies = simulateRotationStrategies(memory, priorities, lat, lon);

    return NextResponse.json({
      success: true,
      source: 'local_engine',
      strategies,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
