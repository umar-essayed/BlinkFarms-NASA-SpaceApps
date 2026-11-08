import { NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

export async function POST(request: Request) {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Groq API key is not configured.' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'Audio file is required in form-data.' },
        { status: 400 }
      );
    }

    const language = formData.get('language') as string | null;

    // Prepare forward FormData for Groq Whisper
    const groqFormData = new FormData();
    groqFormData.append('file', file, 'recording.webm');
    groqFormData.append('model', 'whisper-large-v3-turbo');
    groqFormData.append('response_format', 'json');
    groqFormData.append('temperature', '0.2');
    if (language) {
      groqFormData.append('language', language);
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: groqFormData,
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq Whisper error:', groqRes.status, errText);
      return NextResponse.json(
        { error: `Whisper transcription failed: ${errText}` },
        { status: groqRes.status }
      );
    }

    const data = await groqRes.json();
    return NextResponse.json({
      success: true,
      text: data.text || '',
    });
  } catch (error: any) {
    console.error('Voice transcription error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal voice transcription error' },
      { status: 500 }
    );
  }
}
