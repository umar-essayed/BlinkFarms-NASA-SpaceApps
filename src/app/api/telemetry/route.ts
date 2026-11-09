import { NextResponse } from 'next/server';
import { generateFieldTelemetry } from '@/lib/veloceRootEngine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '30.850');
  const lon = parseFloat(searchParams.get('lon') || '31.050');
  const cropId = searchParams.get('cropId') || 'wheat_giza171';
  const soilType = searchParams.get('soilType') || 'alluvial_clay';
  const fieldNameAr = searchParams.get('nameAr') || 'حقل مخصص';
  const fieldNameEn = searchParams.get('nameEn') || 'Custom Parcel';
  const simulateShock = searchParams.get('shock') === 'true';

  // Base telemetry from coordinate-aware biophysical engine
  let telemetry = generateFieldTelemetry(lat, lon, `field_${lat}_${lon}`, fieldNameAr, fieldNameEn, simulateShock);

  // Seamless live microservice integration with FastAPI (port 8000)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s timeout

    const pyRes = await fetch('http://127.0.0.1:8000/api/v1/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat,
        lon,
        crop_id: cropId,
        soil_type: soilType,
        simulate_shock: simulateShock,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (pyRes.ok) {
      const pyData = await pyRes.json();
      if (pyData?.metrics) {
        telemetry.canopyTempAnomalyC = pyData.metrics.canopy_fever_c;
        telemetry.canopyTempC = pyData.metrics.canopy_temp_c;
        telemetry.airTempC = pyData.metrics.ambient_air_c;
        telemetry.currentESI = pyData.metrics.esi;
        telemetry.currentNDVI = pyData.metrics.ndvi;
        telemetry.prescribedIrrigationMm = pyData.metrics.prescribed_irrigation_mm;
        telemetry.prescribedVolumeM3Ha = pyData.metrics.prescribed_volume_m3_ha;
        telemetry.isFlashDroughtAlert = pyData.metrics.is_flash_drought_alert;

        return NextResponse.json({
          success: true,
          source: 'fastapi_live_nasa_engine',
          coordinates: [lat, lon],
          crop_id: cropId,
          soil_type: soilType,
          metrics: pyData.metrics,
          soil_diagnostic: pyData.soil_diagnostic,
          provenance: pyData.provenance,
          telemetry,
        });
      }
    }
  } catch (_err) {
    // Graceful fallback to local engine if FastAPI server is starting or idle
  }

  return NextResponse.json({
    success: true,
    source: 'local_biophysical_engine',
    coordinates: [lat, lon],
    telemetry,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const lat = typeof body.lat === 'number' ? body.lat : 30.850;
    const lon = typeof body.lon === 'number' ? body.lon : 31.050;
    const cropId = body.crop_id || body.cropId || 'wheat_giza171';
    const soilType = body.soil_type || body.soilType || 'alluvial_clay';
    const simulateShock = Boolean(body.simulate_shock || body.shock);

    // Call FastAPI scientific core with live NASA ingestion
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const pyRes = await fetch('http://127.0.0.1:8000/api/v1/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lon,
          crop_id: cropId,
          soil_type: soilType,
          simulate_shock: simulateShock,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (pyRes.ok) {
        const pyData = await pyRes.json();
        return NextResponse.json(pyData);
      }
    } catch (_e) {
      // Fallback to local
    }

    const telemetry = generateFieldTelemetry(lat, lon, `field_${lat}_${lon}`, 'حقل مخصص', 'Custom Parcel', simulateShock);
    return NextResponse.json({
      success: true,
      source: 'local_biophysical_fallback',
      coordinates: [lat, lon],
      telemetry,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
