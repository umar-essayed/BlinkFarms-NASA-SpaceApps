import { NextResponse } from 'next/server';
import { fetchNasaPowerDaily } from '@/lib/nasaPowerAdapter';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get('lat');
    const lonStr = searchParams.get('lon');

    const lat = latStr ? parseFloat(latStr) : 30.850;
    const lon = lonStr ? parseFloat(lonStr) : 31.050;

    const weather = await fetchNasaPowerDaily(lat, lon);

    return NextResponse.json({
      success: true,
      weather,
    });
  } catch (error: any) {
    console.error('Weather API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch NASA POWER observation',
      },
      { status: 500 }
    );
  }
}
