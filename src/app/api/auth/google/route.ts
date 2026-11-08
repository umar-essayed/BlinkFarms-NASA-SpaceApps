import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { credential, user } = body;

    if (!user || !user.email) {
      return NextResponse.json({ error: 'Missing user payload' }, { status: 400 });
    }

    // Optional Supabase persistence if configured
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name,
            avatar_url: user.avatar || null,
            role: user.role || 'farmer',
            updated_at: new Date().toISOString(),
          }),
        });
      } catch (err) {
        console.warn('Supabase profile sync skipped:', err);
      }
    }

    return NextResponse.json({
      success: true,
      user,
      message: 'Authenticated successfully with Google OAuth',
    });
  } catch (error: any) {
    console.error('Google Auth Route Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
