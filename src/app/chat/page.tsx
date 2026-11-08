'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Language, ChatMessage } from '@/lib/types';
import MarkdownMessage from '@/components/MarkdownMessage';
import { SendIcon } from '@/components/Icons';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Field & User Context State
  const [farmerName, setFarmerName] = useState('يا طيب');
  const [fieldName, setFieldName] = useState('دلتا النيل (طنطا / الغربية)');
  const [areaFeddan, setAreaFeddan] = useState(15);
  const [wizardData, setWizardData] = useState<any>(null);
  const [weatherSummary, setWeatherSummary] = useState<string>('حرارة معتدلة 26°C، رطوبة متزنة، شمس ساطعة');

  // Initialize and load sessions from LocalStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('blinkfarms_lang') as Language;
    if (savedLang) setLang(savedLang);

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
      content:
        currentLang === 'ar'
          ? `يا أهلاً بيك يا ${farmerName}! أنا **المرشد الزراعي الرقمي** في BlinkFarms.
أرضك وسجلاتها محفوظة في ذاكرتي بالكامل؛ مطلع لحظياً على حرارة أوراق النبات بالأشعة تحت الحمراء، رطوبة الجذور، وأرصاد ناسا الجوية لحقلك (${areaFeddan} فدان).

جاهز لأي استفسار:
- كمية وموعد الري الدقيق اليوم بوحدة **م³ / فدان**؟
- تخطيط الدورة الزراعية لـ 3 سنوات لترشيد المياه وزيادة الإنتاج؟
- فك كتمة وانضغاط باطن الأرض (الطبقة الصماء) بيولوجياً؟
اطلب اللي في بالك!`
          : `Welcome ${farmerName}! I am your **BlinkFarms Autonomous Agricultural Agent**.
I am directly connected to your field memory, ECOSTRESS thermal canopy fever radar, and NASA POWER meteorology for your ${areaFeddan}-feddan farmland.

Ask me anything about daily irrigation volume (m³/feddan), 3-year regenerative crop rotations, or biological subsoil hardpan remediation!`,
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
      newTitle = q.length > 32 ? q.substring(0, 32) + '...' : q;
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
      const botReply = data.reply || (lang === 'ar' ? 'تم استلام استفسارك يا طيب.' : 'Query processed.');

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        content: botReply,
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
      className="flex h-screen w-full bg-[#F8F9FA] dark:bg-[#0A0A0C] text-[#1D1D1F] dark:text-[#F5F5F7] overflow-hidden font-sans select-none"
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
        className={`fixed md:static inset-y-0 z-50 flex flex-col justify-between w-[290px] bg-white dark:bg-neutral-900 border-x border-black/5 dark:border-white/10 transition-transform duration-300 ease-in-out shrink-0 ${
          isSidebarOpen
            ? 'translate-x-0'
            : lang === 'ar'
            ? 'translate-x-full md:translate-x-0 md:w-0 md:border-none md:overflow-hidden'
            : '-translate-x-full md:translate-x-0 md:w-0 md:border-none md:overflow-hidden'
        }`}
      >
        <div className="flex flex-col h-full p-4 overflow-hidden">
          {/* Sidebar Top: Brand & New Chat */}
          <div className="space-y-3 pb-3 border-b border-black/5 dark:border-white/10 shrink-0">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <img src="/logo.png" alt="BlinkFarms" className="w-8 h-8 object-contain" />
                <span className="font-black text-sm text-neutral-900 dark:text-white">BlinkFarms</span>
              </Link>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
              >
                ✕
              </button>
            </div>

            {/* New Chat Button (ChatGPT Style) */}
            <button
              onClick={() => {
                createNewSession();
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span className="text-base font-bold">+</span>
              <span>{lang === 'ar' ? 'محادثة استشارية جديدة' : 'New Advisory Chat'}</span>
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-1.5 scrollbar-none">
            <span className="text-[11px] font-bold text-neutral-400 px-2 block mb-2">
              {lang === 'ar' ? 'سجل المحادثات السابقة' : 'Chat History'}
            </span>

            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setActiveSessionId(s.id);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer text-xs font-bold transition-all ${
                  activeSessionId === s.id
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">💬</span>
                  <span className="truncate">{s.title}</span>
                </div>

                <button
                  onClick={(e) => handleDeleteSession(s.id, e)}
                  title={lang === 'ar' ? 'حذف المحادثة' : 'Delete'}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-red-500 transition-opacity"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          {/* Sidebar Bottom: Agent Memory Box */}
          <div className="pt-3 border-t border-black/5 dark:border-white/10 space-y-2 shrink-0">
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 space-y-1.5 border border-black/5 dark:border-white/5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                <span>🧠</span>
                <span>{lang === 'ar' ? 'ذاكرة المرشد لحقلك' : 'Agent Field Memory'}</span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                {lang === 'ar'
                  ? `الحقل: ${fieldName} (${areaFeddan} فدان) — المحصول السابق: ${wizardData?.previousCrop || 'برسيم'} — التربة: ${wizardData?.soilType || 'طميية'}.`
                  : `Field: ${fieldName} (${areaFeddan} feddans) — Crop: ${wizardData?.previousCrop || 'Clover'}.`}
              </p>
            </div>

            <Link
              href="/"
              className="w-full py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <span>🛰️</span>
              <span>{lang === 'ar' ? 'الرجوع للرادار والخريطة' : 'Back to Field Radar'}</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          2. MAIN CHAT WORKSPACE
         ========================================================================= */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header Bar */}
        <header className="h-14 px-4 sm:px-6 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-black/5 dark:border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-800 dark:text-neutral-200 text-sm font-bold transition-all active:scale-95"
              title={lang === 'ar' ? 'القائمة الجانبية للشاتات' : 'Toggle Sidebar'}
            >
              ☰
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <h2 className="text-xs sm:text-sm font-black text-neutral-900 dark:text-white truncate">
                {activeSession?.title || (lang === 'ar' ? 'المرشد الزراعي الذكي' : 'AI Farm Advisor')}
              </h2>
              <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-mono font-bold shrink-0">
                {areaFeddan} {lang === 'ar' ? 'فدان' : 'feddans'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleLang}
              className="px-3 py-1.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-xs font-bold text-neutral-800 dark:text-neutral-200 active:scale-95 transition-all"
            >
              {lang === 'ar' ? 'English' : 'عربي'}
            </button>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 max-w-4xl mx-auto w-full">
          {activeSession?.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 animate-fadeIn ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm text-sm font-bold">
                  🌱
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-bl-none border border-black/5 dark:border-white/5'
                }`}
              >
                {msg.sender === 'user' ? (
                  <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                ) : (
                  <MarkdownMessage content={msg.content || ''} />
                )}
                <span className="block text-[10px] mt-1.5 opacity-60 font-mono text-left" dir="ltr">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {/* Clean 3-Dots Typing Indicator (No Extra Words) */}
          {isChatLoading && (
            <div className="flex gap-3 animate-fadeIn justify-start">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm text-sm">
                🌱
              </div>
              <div className="p-3.5 px-5 rounded-3xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Prompts Carousel & Fixed Bottom Input */}
        <div className="p-3 sm:p-5 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-t border-black/5 dark:border-white/10 shrink-0">
          <div className="max-w-4xl mx-auto w-full space-y-2.5">
            {/* Quick Prompts Carousel */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold whitespace-nowrap active:scale-95 transition-all shrink-0 border border-black/5 dark:border-white/5"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800/80 rounded-3xl p-1.5 pl-3 pr-2 border border-black/5 dark:border-white/5 focus-within:ring-2 focus-within:ring-blue-600 transition-all"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  lang === 'ar'
                    ? 'اسأل المرشد الزراعي عن الري، المحاصيل، أو صحة التربة...'
                    : 'Ask your AI Agronomist about irrigation, crops, or soil...'
                }
                className="flex-1 bg-transparent text-xs sm:text-sm font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none px-2"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isChatLoading}
                className="w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all shadow-md shrink-0"
              >
                <SendIcon className="w-4 h-4 rtl:rotate-180" />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
