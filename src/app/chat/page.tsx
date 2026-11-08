'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Language, ChatMessage } from '@/lib/types';
import MarkdownMessage from '@/components/MarkdownMessage';
import { SendIcon } from '@/components/Icons';
import LiveVoiceOverlay from '@/components/LiveVoiceOverlay';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export default function DedicatedChatPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('ar');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false); // Start collapsed so user sees active chat immediately
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [centralMemory, setCentralMemory] = useState<string[]>([]);
  const [isVoiceOverlayOpen, setIsVoiceOverlayOpen] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Field & User Context State
  const [farmerName, setFarmerName] = useState('يا طيب');
  const [fieldName, setFieldName] = useState('دلتا النيل (طنطا / الغربية)');
  const [areaFeddan, setAreaFeddan] = useState(15);
  const [wizardData, setWizardData] = useState<any>(null);
  const [weatherSummary, setWeatherSummary] = useState<string>('حرارة معتدلة 26°C، رطوبة متزنة، شمس ساطعة');

  // Initialize and load sessions & central memory from LocalStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('blinkfarms_lang') as Language;
    if (savedLang) setLang(savedLang);

    // Read Central Cross-Session Memory
    const savedCentralMem = localStorage.getItem('blinkfarms_central_memory');
    if (savedCentralMem) {
      try {
        setCentralMemory(JSON.parse(savedCentralMem));
      } catch {}
    }

    // Read logged in user
    const savedUser = localStorage.getItem('blinkfarms_auth_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.name) setFarmerName(u.name.split(' ')[0]);
      } catch {}
    }

    // Read Wizard answers
    const savedWizard = localStorage.getItem('blinkfarms_wizard_answers');
    if (savedWizard) {
      try {
        const w = JSON.parse(savedWizard);
        setWizardData(w);
        if (w.areaFeddan) setAreaFeddan(w.areaFeddan);
      } catch {}
    }

    // Load or create initial chat session
    const savedSessions = localStorage.getItem('blinkfarms_chat_sessions_v2');
    if (savedSessions) {
      try {
        const parsed: ChatSession[] = JSON.parse(savedSessions);
        if (parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
          return;
        }
      } catch (e) {
        console.error('Failed to parse sessions', e);
      }
    }

    // Create default initial session if none exists
    createNewSession(savedLang || 'ar');
  }, []);

  const createNewSession = (currentLang: Language = lang) => {
    const newId = `session_${Date.now()}`;
    const welcomeMsg: ChatMessage = {
      id: `welcome_${Date.now()}`,
      sender: 'assistant',
      content: currentLang === 'ar' ? 'أهلاً بك! كيف أساعدك اليوم؟' : 'Welcome! How can I help today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newSession: ChatSession = {
      id: newId,
      title: currentLang === 'ar' ? 'محادثة إرشادية جديدة' : 'New Advisory Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [welcomeMsg],
    };

    setSessions((prev) => {
      const updated = [newSession, ...prev];
      localStorage.setItem('blinkfarms_chat_sessions_v2', JSON.stringify(updated));
      return updated;
    });
    setActiveSessionId(newId);
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isChatLoading]);

  const toggleLang = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    localStorage.setItem('blinkfarms_lang', nextLang);
    document.documentElement.lang = nextLang;
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
  };

  const handleDeleteSession = (sessionIdToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== sessionIdToDelete);
    setSessions(updated);
    localStorage.setItem('blinkfarms_chat_sessions_v2', JSON.stringify(updated));

    if (activeSessionId === sessionIdToDelete) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
      } else {
        createNewSession();
      }
    }
  };

  const QUICK_PROMPTS =
    lang === 'ar'
      ? [
          '💧 محتاج أروي النهاردة ولا لأ، وكم متر مكعب للفدان؟',
          '🌾 إيه أفضل دورة زراعية بعد محصولي الحالي توفر ميه؟',
          '🌡️ الجو والأرصاد في حقلي النهاردة مناسبين للرش؟',
          '🛠️ إزاي أعالج كتمة وانضغاط باطن التربة بيولوجياً؟',
        ]
      : [
          '💧 Should I irrigate today? Exact m³/feddan needed?',
          '🌾 Best 3-year crop succession to save water after my crop?',
          '🌡️ Are weather & wind conditions safe for spraying today?',
          '🛠️ How do I biologically remediate subsoil compaction?',
        ];

  const handleVoiceNewMessage = (userText: string, assistantReply: string) => {
    if (!activeSession) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const botMsg: ChatMessage = {
      id: `bot_${Date.now() + 1}`,
      sender: 'assistant',
      content: assistantReply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    let newTitle = activeSession.title;
    if (activeSession.messages.length <= 1) {
      newTitle = userText.length > 28 ? userText.substring(0, 28) + '...' : userText;
    }

    const updatedSession: ChatSession = {
      ...activeSession,
      title: newTitle,
      updatedAt: new Date().toISOString(),
      messages: [...activeSession.messages, userMsg, botMsg],
    };

    const newSessionsList = sessions.map((s) => (s.id === activeSession.id ? updatedSession : s));
    setSessions(newSessionsList);
    localStorage.setItem('blinkfarms_chat_sessions_v2', JSON.stringify(newSessionsList));
  };

  const handleSpeakMessage = (msgId: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;

    if (speakingMessageId === msgId) {
      synth.cancel();
      setSpeakingMessageId(null);
      return;
    }

    synth.cancel();
    setSpeakingMessageId(msgId);

    // Clean text for speech
    const clean = text
      .replace(/\[MEMORY:[^\]]+\]/g, '')
      .replace(/\*\*/g, '')
      .replace(/###/g, '')
      .replace(/\|/g, ' ')
      .replace(/-{3,}/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = lang === 'ar' ? 'ar-EG' : 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = synth.getVoices();
    if (voices && voices.length > 0) {
      const match = voices.find((v) =>
        lang === 'ar' ? v.lang.startsWith('ar') : v.lang.startsWith('en')
      );
      if (match) utterance.voice = match;
    }

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    synth.speak(utterance);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const q = textToSend || inputText;
    if (!q.trim() || isChatLoading || !activeSession) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Update active session locally
    const currentMessages = [...activeSession.messages, userMsg];
    let newTitle = activeSession.title;
    if (activeSession.messages.length <= 1) {
      newTitle = q.length > 28 ? q.substring(0, 28) + '...' : q;
    }

    const updatedSession: ChatSession = {
      ...activeSession,
      title: newTitle,
      updatedAt: new Date().toISOString(),
      messages: currentMessages,
    };

    const newSessionsList = sessions.map((s) => (s.id === activeSession.id ? updatedSession : s));
    setSessions(newSessionsList);
    localStorage.setItem('blinkfarms_chat_sessions_v2', JSON.stringify(newSessionsList));
    setInputText('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          lang,
          centralMemory, // Cross-session permanent memory
          history: currentMessages.map((m) => ({
            role: m.sender === 'assistant' ? 'assistant' : 'user',
            content: m.content || '',
          })),
          context: {
            fieldName,
            areaFeddan,
            canopyTempAnomalyC: 2.6,
            prescribedIrrigationMm: 5.6,
            hardpanDetected: wizardData?.subsoilIssue === 'hardpan',
            previousCrop: wizardData?.previousCrop || 'برسيم بلدي',
            soilType: wizardData?.soilType || 'طميية ثقيلة',
            irrigationType: wizardData?.irrigationType || 'تنقيط',
            primaryPriority: wizardData?.primaryPriority || 'water',
            recommendedRotationTitle: 'الدورة التكيفية المتوازنة (برسيم ➔ قمح ديورم ➔ عباد شمس)',
            waterSavedPercent: 46,
            weatherSummary,
            agentMemory: [
              `المساحة: ${areaFeddan} فدان`,
              `المحصول السابق: ${wizardData?.previousCrop || 'برسيم'}`,
              `التربة: ${wizardData?.soilType || 'طميية'}`,
              `نظام الري: ${wizardData?.irrigationType || 'تنقيط'}`,
            ],
          },
        }),
      });

      const data = await res.json();
      let rawBotReply = data.reply || (lang === 'ar' ? 'تم استلام استفسارك يا طيب.' : 'Query processed.');

      // Extract and save central memory tags [MEMORY: key = value]
      const memMatches = rawBotReply.match(/\[MEMORY:\s*(.*?)\]/g);
      if (memMatches) {
        let currentMem: string[] = JSON.parse(localStorage.getItem('blinkfarms_central_memory') || '[]');
        memMatches.forEach((mStr: string) => {
          const item = mStr.replace(/\[MEMORY:\s*|\]/g, '').trim();
          if (item && !currentMem.includes(item)) {
            currentMem.push(item);
          }
        });
        localStorage.setItem('blinkfarms_central_memory', JSON.stringify(currentMem));
        setCentralMemory(currentMem);
        rawBotReply = rawBotReply.replace(/\[MEMORY:\s*(.*?)\]/g, '').trim();
      }

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        content: rawBotReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const finalMessages = [...currentMessages, botMsg];
      const finalizedSession = {
        ...updatedSession,
        messages: finalMessages,
      };

      const finalSessionsList = sessions.map((s) => (s.id === activeSession.id ? finalizedSession : s));
      setSessions(finalSessionsList);
      localStorage.setItem('blinkfarms_chat_sessions_v2', JSON.stringify(finalSessionsList));
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="flex h-[100dvh] max-h-[100dvh] w-full bg-[#F8F9FA] dark:bg-[#0A0A0C] text-[#1D1D1F] dark:text-[#F5F5F7] overflow-hidden font-sans select-none"
    >
      {/* =========================================================================
          1. CHATGPT-LIKE COLLAPSIBLE SIDEBAR
         ========================================================================= */}
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 z-50 flex flex-col justify-between w-[290px] bg-white dark:bg-neutral-900 border-x border-black/5 dark:border-white/10 transition-all duration-300 ease-in-out shrink-0 ${
          isSidebarOpen
            ? 'translate-x-0'
            : lang === 'ar'
            ? 'translate-x-full md:w-0 md:border-none md:overflow-hidden'
            : '-translate-x-full md:w-0 md:border-none md:overflow-hidden'
        }`}
      >
        <div className="flex flex-col h-full p-3.5 overflow-hidden">
          {/* Sidebar Top: Brand & New Chat */}
          <div className="space-y-2.5 pb-2.5 border-b border-black/5 dark:border-white/10 shrink-0">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <img src="/blink-ai-logo.png" alt="Blink AI" className="w-7 h-7 rounded-full object-cover border border-emerald-500/40" />
                <span className="font-black text-sm text-neutral-900 dark:text-white">Blink AI</span>
              </Link>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
              >
                ✕
              </button>
            </div>

            {/* New Chat Button */}
            <button
              onClick={() => {
                createNewSession();
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
              className="w-full py-2 px-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <span className="text-base font-bold">+</span>
              <span>{lang === 'ar' ? 'محادثة جديدة' : 'New Chat'}</span>
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto py-2 space-y-1 scrollbar-none">
            <span className="text-[10px] font-bold text-neutral-400 px-2 block mb-1">
              {lang === 'ar' ? 'المحادثات السابقة' : 'Past Chats'}
            </span>

            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setActiveSessionId(s.id);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`group flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs font-semibold transition-all ${
                  activeSessionId === s.id
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs shrink-0">💬</span>
                  <span className="truncate text-[11px]">{s.title}</span>
                </div>

                <button
                  onClick={(e) => handleDeleteSession(s.id, e)}
                  title={lang === 'ar' ? 'حذف' : 'Delete'}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-red-500 hover:bg-red-50 text-[10px] transition-opacity"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          {/* Sidebar Bottom: Cross-Session Central Memory Box */}
          <div className="pt-2.5 border-t border-black/5 dark:border-white/10 space-y-2 shrink-0">
            <div className="p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 space-y-1.5 border border-black/5 dark:border-white/5">
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                <div className="flex items-center gap-1.5">
                  <span>🧠</span>
                  <span>{lang === 'ar' ? 'الذاكرة المركزية الدائمة' : 'Central Memory'}</span>
                </div>
                {centralMemory.length > 0 && (
                  <button
                    onClick={() => {
                      localStorage.removeItem('blinkfarms_central_memory');
                      setCentralMemory([]);
                    }}
                    title={lang === 'ar' ? 'مسح الذاكرة' : 'Clear Memory'}
                    className="text-[9px] text-neutral-400 hover:text-red-500"
                  >
                    {lang === 'ar' ? 'مسح' : 'Clear'}
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {centralMemory.length === 0 ? (
                  <p className="text-[10px] text-neutral-400 italic">
                    {lang === 'ar' ? 'يتعلم البوت تلقائياً من المحادثات' : 'Learns facts across chats'}
                  </p>
                ) : (
                  centralMemory.map((mem, idx) => (
                    <div key={idx} className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate flex items-center gap-1">
                      <span>•</span>
                      <span>{mem}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Link
              href="/"
              className="w-full py-1.5 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <span>🛰️</span>
              <span>{lang === 'ar' ? 'الرجوع للرادار والخريطة' : 'Back to Radar'}</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          2. MAIN CHAT WORKSPACE (STRICTLY ONE SCREEN - NO SCROLLBAR OUTSIDE)
         ========================================================================= */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header Bar */}
        <header className="h-12 px-3 sm:px-5 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-black/5 dark:border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all active:scale-95"
              title={lang === 'ar' ? 'المحادثات والذاكرة' : 'Toggle Sidebar'}
            >
              ☰
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <img src="/blink-ai-logo.png" alt="Blink AI" className="w-6 h-6 rounded-full object-cover border border-emerald-500/40 shrink-0 shadow-sm" />
              <div className="truncate">
                <span className="text-xs font-bold text-neutral-900 dark:text-white block truncate">
                  Blink AI — {activeSession?.title || (lang === 'ar' ? 'مساعدك الزراعي' : 'Advisor')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Voice Call Button in Header */}
            <button
              onClick={() => setIsVoiceOverlayOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-bold shadow-sm shadow-emerald-500/20 active:scale-95 transition-all"
              title={lang === 'ar' ? 'تحدث مع المرشد بالصوت المباشر' : 'Live Voice Call with Advisor'}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>{lang === 'ar' ? 'مكالمة صوتية' : 'Live Voice'}</span>
            </button>

            <button
              onClick={toggleLang}
              className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 active:scale-95 transition-all"
            >
              {lang === 'ar' ? 'English' : 'عربي'}
            </button>
            <Link
              href="/"
              className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 active:scale-95 transition-all flex items-center gap-1"
            >
              <span>✕</span>
            </Link>
          </div>
        </header>

        {/* Messages List Area (Scrolling ONLY here) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5 scrollbar-thin">
          <div className="max-w-2xl mx-auto space-y-3.5">
            {activeSession?.messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <img
                    src="/blink-ai-logo.png"
                    alt="Blink AI"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-emerald-500/40 shadow-sm shrink-0"
                  />
                )}

                <div
                  className={`relative group max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-sm ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : 'bg-white dark:bg-neutral-800/90 text-neutral-800 dark:text-neutral-100 border border-black/5 dark:border-white/5 rounded-bl-xs'
                  }`}
                >
                  <MarkdownMessage content={m.content || ''} />
                  
                  <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-black/5 dark:border-white/5">
                    {m.sender === 'assistant' ? (
                      <button
                        onClick={() => handleSpeakMessage(m.id, m.content || '')}
                        className="text-[11px] p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center gap-1 font-medium"
                        title={speakingMessageId === m.id ? 'إيقاف الصوت' : 'استمع للإجابة بصوت المرشد'}
                      >
                        <span>{speakingMessageId === m.id ? '⏹️' : '🔊'}</span>
                        <span className="text-[10px] hidden sm:inline">
                          {speakingMessageId === m.id
                            ? (lang === 'ar' ? 'إيقاف' : 'Stop')
                            : (lang === 'ar' ? 'استمع' : 'Listen')}
                        </span>
                      </button>
                    ) : <div />}

                    <span
                      className={`text-[9px] opacity-60 ${
                        m.sender === 'user' ? 'text-white/80' : 'text-neutral-400'
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Clean 3-dots typing loader */}
            {isChatLoading && (
              <div className="flex gap-2.5 items-center justify-start">
                <img
                  src="/blink-ai-logo.png"
                  alt="Blink AI"
                  className="w-7 h-7 rounded-full object-cover border border-emerald-500/40 shadow-sm shrink-0 animate-pulse"
                />
                <div className="bg-white dark:bg-neutral-800/90 border border-black/5 dark:border-white/5 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        {activeSession?.messages.length <= 2 && (
          <div className="px-3 sm:px-5 py-1.5 shrink-0 overflow-x-auto scrollbar-none flex gap-1.5 max-w-2xl mx-auto w-full">
            {QUICK_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p)}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-black/5 dark:border-white/5 text-neutral-600 dark:text-neutral-300 whitespace-nowrap active:scale-95 transition-all shrink-0"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Fixed Bottom Input Bar (Sticky above bottom of screen) */}
        <div className="p-2.5 sm:p-3.5 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-t border-black/5 dark:border-white/10 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="max-w-2xl mx-auto flex items-center gap-2"
          >
            {/* Quick Live Voice Mode Trigger Button */}
            <button
              type="button"
              onClick={() => setIsVoiceOverlayOpen(true)}
              className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 shadow-sm active:scale-95 transition-all shrink-0 flex items-center justify-center text-sm"
              title={lang === 'ar' ? 'محادثة صوتية حية مع المرشد' : 'Live Voice Call'}
            >
              🎙️
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={lang === 'ar' ? 'اسأل عن ري أرضك، الطقس، أو الدورة الزراعية...' : 'Ask about irrigation, weather, or crops...'}
              disabled={isChatLoading}
              className="flex-1 px-3.5 py-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-xs sm:text-sm font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-600 border border-black/5 dark:border-white/5"
            />
            <button
              type="submit"
              disabled={isChatLoading || !inputText.trim()}
              className="p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white shadow-md active:scale-95 transition-all shrink-0"
            >
              <SendIcon className="w-4 h-4 rtl:rotate-180" />
            </button>
          </form>
        </div>
      </main>

      {/* Futuristic Live Voice Call Overlay (ChatGPT / Gemini Live Experience) */}
      <LiveVoiceOverlay
        isOpen={isVoiceOverlayOpen}
        onClose={() => setIsVoiceOverlayOpen(false)}
        lang={lang}
        onNewMessage={handleVoiceNewMessage}
        centralMemory={centralMemory}
        farmContext={{
          fieldName,
          areaFeddan,
          canopyTempAnomalyC: 2.6,
          prescribedIrrigationMm: 5.6,
          hardpanDetected: wizardData?.subsoilIssue === 'hardpan',
          previousCrop: wizardData?.previousCrop || 'برسيم بلدي',
          soilType: wizardData?.soilType || 'طميية ثقيلة',
          irrigationType: wizardData?.irrigationType || 'تنقيط',
          primaryPriority: wizardData?.primaryPriority || 'water',
          recommendedRotationTitle: 'الدورة التكيفية المتوازنة (برسيم ➔ قمح ديورم ➔ عباد شمس)',
          waterSavedPercent: 46,
          weatherSummary,
        }}
      />
    </div>
  );
}
