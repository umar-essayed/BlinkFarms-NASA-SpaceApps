'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Language } from '@/lib/types';

interface LiveVoiceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onNewMessage: (userText: string, assistantReply: string) => void;
  farmContext: any;
  centralMemory: string[];
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export default function LiveVoiceOverlay({
  isOpen,
  onClose,
  lang,
  onNewMessage,
  farmContext,
  centralMemory,
}: LiveVoiceOverlayProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [assistantReply, setAssistantReply] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // When overlay opens, start mic
  useEffect(() => {
    if (isOpen) {
      startVoiceSession();
    } else {
      stopVoiceSession();
    }
    return () => {
      stopVoiceSession();
    };
  }, [isOpen]);

  const startVoiceSession = async () => {
    setErrorMessage(null);
    setUserTranscript('');
    setAssistantReply(
      lang === 'ar'
        ? 'أهلاً بك يا حاج، أنا سامعك.. اتفضل قول اللي شاغل بالك في أرضك.'
        : 'Hello! I am listening. Tell me what is happening on your farm.'
    );

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio analysis for pulsing orb effect
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        audioContextRef.current = ctx;
        analyserRef.current = analyser;

        const updateVolume = () => {
          if (!analyserRef.current) return;
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setVolumeLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(updateVolume);
        };
        updateVolume();
      } catch (err) {
        console.warn('Audio analyzer not available', err);
      }

      // Initial greeting voice
      speakGreeting();
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setErrorMessage(
        lang === 'ar'
          ? 'تعذر الوصول إلى الميكروفون. يرجى تفعيل إذن الميكروفون في المتصفح.'
          : 'Microphone permission denied. Please allow microphone access.'
      );
    }
  };

  const speakGreeting = () => {
    const greeting =
      lang === 'ar'
        ? 'أهلاً بك يا حاج، أنا سامعك.. اتفضل قول اللي شاغل بالك في أرضك.'
        : 'Hello! I am listening. Tell me what is happening on your farm.';

    speakText(greeting, () => {
      startListening();
    });
  };

  const startListening = () => {
    if (!streamRef.current) return;
    if (synthRef.current?.speaking) synthRef.current.cancel();

    setVoiceState('listening');
    audioChunksRef.current = [];

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 1000) {
          processUserAudio(audioBlob);
        } else {
          // Empty audio, listen again
          startListening();
        }
      };

      mediaRecorder.start(250);
    } catch (e: any) {
      console.error('Failed to start MediaRecorder:', e);
      setVoiceState('idle');
    }
  };

  const stopListeningAndSend = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setVoiceState('processing');
    }
  };

  const processUserAudio = async (blob: Blob) => {
    setVoiceState('processing');
    try {
      // 1. Transcribe with Groq Whisper API
      const formData = new FormData();
      formData.append('file', blob, 'user_audio.webm');
      formData.append('language', lang);

      const transcribeRes = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) {
        throw new Error('فشل تفريغ الصوت عبر Whisper');
      }

      const transcribeData = await transcribeRes.json();
      const transcribedText = (transcribeData.text || '').trim();

      if (!transcribedText) {
        // Nothing understood, prompt again
        speakText(
          lang === 'ar' ? 'معلش مسمعتكش كويس، ممكن تقول تاني؟' : 'Sorry, I did not catch that. Please try again.',
          () => startListening()
        );
        return;
      }

      setUserTranscript(transcribedText);

      // 2. Query Groq GPT-OSS 120B Agricultural Brain
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: transcribedText,
          lang,
          context: farmContext,
          centralMemory,
        }),
      });

      const chatData = await chatRes.json();
      const rawReply = chatData.reply || (lang === 'ar' ? 'تم الفحص بنجاح.' : 'Processed.');
      
      // Clean reply for TTS (remove markdown tables, asterisks, etc.)
      const cleanedSpokenReply = rawReply
        .replace(/\[MEMORY:[^\]]+\]/g, '')
        .replace(/\*\*/g, '')
        .replace(/###/g, '')
        .replace(/\|/g, ' ')
        .replace(/-{3,}/g, '')
        .trim();

      setAssistantReply(rawReply);

      // 3. Record in parent chat history (dual persistence)
      onNewMessage(transcribedText, rawReply);

      // 4. Speak response back via TTS
      speakText(cleanedSpokenReply, () => {
        // After speaking ends, auto-listen for farmer's reply
        if (!isMuted) {
          startListening();
        }
      });
    } catch (err: any) {
      console.error('Live voice processing error:', err);
      setErrorMessage(err.message || 'حدث خطأ في معالجة الصوت.');
      setVoiceState('idle');
    }
  };

  const speakText = (text: string, onEnd?: () => void) => {
    if (!synthRef.current) {
      if (onEnd) onEnd();
      return;
    }

    synthRef.current.cancel();
    setVoiceState('speaking');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ar' ? 'ar-EG' : 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick appropriate voice if available
    const voices = synthRef.current.getVoices();
    if (voices && voices.length > 0) {
      const match = voices.find((v) =>
        lang === 'ar' ? v.lang.startsWith('ar') : v.lang.startsWith('en')
      );
      if (match) utterance.voice = match;
    }

    utterance.onend = () => {
      setVoiceState('idle');
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      setVoiceState('idle');
      if (onEnd) onEnd();
    };

    synthRef.current.speak(utterance);
  };

  const stopVoiceSession = () => {
    if (synthRef.current?.speaking) {
      synthRef.current.cancel();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setVoiceState('idle');
  };

  const toggleMute = () => {
    if (voiceState === 'listening') {
      stopListeningAndSend();
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
      startListening();
    } else {
      setIsMuted(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#080B10]/95 backdrop-blur-2xl text-white select-none p-4 sm:p-8 animate-in fade-in duration-300"
    >
      {/* Top Header: Status & Close */}
      <div className="w-full max-w-xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>BlinkFarms Live Voice</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                Groq 120B
              </span>
            </span>
            <span className="text-[11px] text-neutral-400">
              {voiceState === 'listening' && (lang === 'ar' ? 'أنا سامعك.. اتفضل اتكلم' : 'Listening to you...')}
              {voiceState === 'processing' && (lang === 'ar' ? 'جاري التحليل واستدعاء بيانات ناسا...' : 'Processing with NASA Data...')}
              {voiceState === 'speaking' && (lang === 'ar' ? 'المرشد يتحدث الآن' : 'Agent is speaking...')}
              {voiceState === 'idle' && (lang === 'ar' ? 'جاهز للمحادثة' : 'Ready')}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all"
          title={lang === 'ar' ? 'إنهاء المكالمة والرجوع للشات' : 'End Call'}
        >
          ✕
        </button>
      </div>

      {/* Central Visualizer: Futuristic Glowing Pulsing Audio Orb */}
      <div className="relative flex-1 flex flex-col items-center justify-center w-full max-w-md my-auto">
        <div className="relative flex items-center justify-center w-64 h-64 sm:w-72 sm:h-72">
          {/* Outer Pulsing Glow Rings */}
          <div
            className={`absolute inset-0 rounded-full transition-all duration-700 blur-2xl opacity-40 ${
              voiceState === 'listening'
                ? 'bg-emerald-500 scale-110'
                : voiceState === 'processing'
                ? 'bg-cyan-500 animate-spin'
                : voiceState === 'speaking'
                ? 'bg-blue-600 scale-125 animate-pulse'
                : 'bg-emerald-600/30'
            }`}
            style={{
              transform: voiceState === 'listening' ? `scale(${1 + volumeLevel / 150})` : undefined,
            }}
          />

          {/* Secondary Ring */}
          <div
            className={`absolute inset-4 rounded-full border transition-all duration-300 ${
              voiceState === 'listening'
                ? 'border-emerald-400/40 animate-ping'
                : voiceState === 'speaking'
                ? 'border-blue-400/50 animate-pulse'
                : 'border-white/10'
            }`}
          />

          {/* Core Interactive Glowing Orb */}
          <div
            onClick={() => {
              if (voiceState === 'listening') {
                stopListeningAndSend();
              } else if (voiceState === 'speaking') {
                if (synthRef.current?.speaking) synthRef.current.cancel();
                startListening();
              } else {
                startListening();
              }
            }}
            className={`relative z-10 w-44 h-44 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center cursor-pointer shadow-2xl transition-all duration-300 active:scale-95 ${
              voiceState === 'listening'
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-emerald-500/50'
                : voiceState === 'processing'
                ? 'bg-gradient-to-tr from-cyan-600 to-blue-500 shadow-cyan-500/50 animate-pulse'
                : voiceState === 'speaking'
                ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-blue-500/50'
                : 'bg-gradient-to-tr from-neutral-800 to-neutral-700 shadow-black/50'
            }`}
          >
            <div className="text-4xl mb-1">
              {voiceState === 'listening' && '🎙️'}
              {voiceState === 'processing' && '⚡'}
              {voiceState === 'speaking' && '🔊'}
              {voiceState === 'idle' && '🌱'}
            </div>
            <span className="text-[11px] font-bold text-white/90">
              {voiceState === 'listening' && (lang === 'ar' ? 'المس للإرسال' : 'Tap to send')}
              {voiceState === 'processing' && (lang === 'ar' ? 'بيفكر...' : 'Thinking...')}
              {voiceState === 'speaking' && (lang === 'ar' ? 'المس للمقاطعة' : 'Tap to interrupt')}
              {voiceState === 'idle' && (lang === 'ar' ? 'المس للتحدث' : 'Tap to speak')}
            </span>
          </div>
        </div>

        {/* Live Audio Transcript Subtitles */}
        <div className="w-full mt-6 px-4 text-center space-y-2">
          {userTranscript && (
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-neutral-300 font-medium">
              <span className="text-emerald-400 font-bold block text-[10px] mb-0.5">
                {lang === 'ar' ? 'كلامك:' : 'You said:'}
              </span>
              "{userTranscript}"
            </div>
          )}

          {assistantReply && (
            <div className="p-3 rounded-2xl bg-blue-950/40 border border-blue-500/20 text-xs sm:text-sm text-neutral-200 leading-relaxed font-normal max-h-32 overflow-y-auto scrollbar-thin">
              <span className="text-blue-400 font-bold block text-[10px] mb-0.5">
                {lang === 'ar' ? 'رد المرشد الزراعي:' : 'Agent Response:'}
              </span>
              {assistantReply}
            </div>
          )}

          {errorMessage && (
            <div className="p-2 rounded-xl bg-red-950/50 border border-red-500/30 text-xs text-red-300">
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls Bar: End, Mute, Push-to-Talk */}
      <div className="w-full max-w-sm flex items-center justify-center gap-6 shrink-0 pt-4">
        {/* Toggle Mute / Pause */}
        <button
          onClick={toggleMute}
          className={`w-13 h-13 rounded-full flex items-center justify-center text-lg transition-all active:scale-95 ${
            isMuted
              ? 'bg-amber-600 text-white'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
          title={isMuted ? 'إلغاء الكتم' : 'كتم الميكروفون'}
        >
          {isMuted ? '🔇' : '🎙️'}
        </button>

        {/* Big Push-To-Talk Button */}
        <button
          onClick={() => {
            if (voiceState === 'listening') {
              stopListeningAndSend();
            } else {
              startListening();
            }
          }}
          className={`px-6 py-3 rounded-full font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center gap-2 ${
            voiceState === 'listening'
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
          }`}
        >
          <span>{voiceState === 'listening' ? '⏹️ تم الكلام' : '▶️ ابدأ الكلام'}</span>
        </button>

        {/* End Call Button */}
        <button
          onClick={onClose}
          className="w-13 h-13 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-lg shadow-lg shadow-red-600/30 transition-all active:scale-95"
          title={lang === 'ar' ? 'إنهاء المكالمة والرجوع للشات' : 'End Call'}
        >
          📞
        </button>
      </div>
    </div>
  );
}
