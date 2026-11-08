import { NextResponse } from 'next/server';
import { generateFieldTelemetry } from '@/lib/veloceRootEngine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '30.850');
  const lon = parseFloat(searchParams.get('lon') || '31.050');
  const fieldNameAr = searchParams.get('nameAr') || 'حقل مخصص';
  const fieldNameEn = searchParams.get('nameEn') || 'Custom Parcel';
  const simulateShock = searchParams.get('shock') === 'true';

  // Base telemetry from coordinate-aware engine
  let telemetry = generateFieldTelemetry(lat, lon, `field_${lat}_${lon}`, fieldNameAr, fieldNameEn, simulateShock);

  // Optional seamless microservice integration with FastAPI (port 8000)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600); // 600ms fast timeout

    const pyRes = await fetch('http://127.0.0.1:8000/api/v1/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat,
        lon,
        t_air: telemetry.airTempC,
        rh: 0.35,
        r_net: 450.0,
        pet: 7.5,
        theta_root_30m: telemetry.rootZoneMoistureMm / 300.0,
        theta_fc: 0.34,
        z_r: 1.2,
        area_ha: 25.0,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (pyRes.ok) {
      const pyData = await pyRes.json();
      if (pyData?.metrics) {
        telemetry.canopyTempAnomalyC = pyData.metrics.canopy_fever_c;
        telemetry.prescribedIrrigationMm = pyData.metrics.prescribed_irrigation_mm;
        telemetry.prescribedVolumeM3Ha = pyData.metrics.prescribed_volume_m3_ha;
      }
    }
  } catch (_err) {
    // Graceful fallback to local engine if FastAPI server is starting or idle
  }

  return NextResponse.json({
    success: true,
    coordinates: [lat, lon],
    telemetry,
  });
}
