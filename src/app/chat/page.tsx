'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Language, ChatMessage } from '@/lib/types';
import MarkdownMessage from '@/components/MarkdownMessage';
import { SendIcon } from '@/components/Icons';

export default function DedicatedChatPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('ar');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Field context stored in localStorage or default
  const [fieldName, setFieldName] = useState('دلتا النيل (طنطا / الغربية)');
  const [areaFeddan, setAreaFeddan] = useState(15);

  useEffect(() => {
    const savedLang = localStorage.getItem('blinkfarms_lang') as Language;
    if (savedLang) setLang(savedLang);

    // Initial greeting
    setMessages([
      {
        id: 'msg_welcome',
        sender: 'assistant',
        content:
          (savedLang || 'ar') === 'ar'
            ? 'يا أهلاً بيك يا طيب! أنا **مرشد BlinkFarms الذكي**. أرضك في عنينا، شايفين النتح ورطوبة التربة عبر أقمار ناسا الصناعية. محتاج تعرف احتياج الري لليوم، تسأل عن كتمة باطن التربة، أو نخطط الدورة الزراعية؟ اطلب اللي في بالك.'
            : 'Welcome! I am your **BlinkFarms AI Advisor**. I track your field transpiration and subsoil moisture via NASA Earth observations. Ask me anything about irrigation scheduling, subsoil compaction, or 3-year crop succession!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatLoading]);

  const toggleLang = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    localStorage.setItem('blinkfarms_lang', nextLang);
    document.documentElement.lang = nextLang;
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
  };

  const QUICK_PROMPTS =
    lang === 'ar'
      ? [
          '💧 هل الزرع محتاج ري النهاردة وكم متر مكعب للفدان؟',
          '⏱️ ليه الزرع لسه أخضر وبتقول في جفاف؟',
          '🌾 إيه أفضل دورة زراعية لـ 3 سنوات توفر ميه؟',
          '🛠️ إزاي أعالج كتمة وانضغاط باطن التربة (Hardpan)؟',
        ]
      : [
          '💧 Should I irrigate today? How much water per feddan?',
          '⏱️ Why is the crop green if there is flash drought?',
          '🌾 What is the best 3-year crop rotation to save water?',
          '🛠️ How do I treat subsoil hardpan compaction?',
        ];

  const handleSendMessage = async (textToSend?: string) => {
    const q = textToSend || inputText;
    if (!q.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          lang,
          context: {
            fieldName,
            areaFeddan,
            canopyTempAnomalyC: 2.8,
            prescribedIrrigationMm: 5.6,
            hardpanDetected: false,
            previousCrop: 'berseem',
            soilType: 'clay_loam',
            irrigationType: 'drip',
            primaryPriority: 'water',
          },
        }),
      });

      const data = await res.json();
      const botText =
        data.reply || (lang === 'ar' ? 'عفواً، يرجى المحاولة مرة أخرى.' : 'Please try again.');

      setMessages((prev) => [
        ...prev,
        {
          id: `b_${Date.now()}`,
          sender: 'assistant',
          content: botText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `b_err_${Date.now()}`,
          sender: 'assistant',
          content:
            lang === 'ar'
              ? 'تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً.'
              : 'Network error, please retry.',
          timestamp: 'Now',
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F5F5F7] dark:bg-black overflow-hidden z-50">
      {/* Dedicated Chat Top Navigation Bar */}
      <header className="h-14 sm:h-16 px-4 sm:px-6 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-b border-black/5 dark:border-white/10 flex items-center justify-between shrink-0 z-10">
        {/* Back Button to Dashboard */}
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all active:scale-95"
        >
          <span className="rtl:rotate-180">←</span>
          <span>{lang === 'ar' ? 'الرجوع للرادار' : 'Back to Radar'}</span>
        </Link>

        {/* Brand Center Title */}
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="BlinkFarms AI"
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow-sm"
          />
          <span className="text-sm sm:text-base font-extrabold text-neutral-900 dark:text-white">
            {lang === 'ar' ? 'المرشد الزراعي الذكي' : 'BlinkFarms AI Advisor'}
          </span>
        </div>

        {/* Language Switcher */}
        <button
          onClick={toggleLang}
          className="text-xs font-bold px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-all active:scale-95"
        >
          {lang === 'ar' ? 'EN' : 'عربي'}
        </button>
      </header>

      {/* Messages Feed (The ONLY container that scrolls) */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-3.5 max-w-3xl mx-auto w-full no-scrollbar overscroll-contain">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-end gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'assistant' && (
              <img
                src="/logo.png"
                alt="BlinkFarms AI"
                className="w-7 h-7 object-contain shrink-0 mb-1 drop-shadow-sm"
              />
            )}
            <div
              className={`max-w-[85%] sm:max-w-[76%] p-3.5 sm:p-4 rounded-3xl text-xs sm:text-sm leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm shadow-md font-medium'
                  : 'bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md text-neutral-900 dark:text-neutral-100 rounded-bl-sm shadow-sm'
              }`}
            >
              {m.sender === 'assistant' ? (
                <MarkdownMessage content={m.content || m.text || ''} />
              ) : (
                <p>{m.content || m.text}</p>
              )}
              <span
                className={`block text-[9px] mt-1.5 text-end ${
                  m.sender === 'user' ? 'text-blue-100' : 'text-neutral-400'
                }`}
              >
                {m.timestamp}
              </span>
            </div>
          </div>
        ))}

        {/* Loader: Exactly 3 Bouncing Dots ONLY */}
        {isChatLoading && (
          <div className="flex items-end gap-2 justify-start">
            <img
              src="/logo.png"
              alt="BlinkFarms AI"
              className="w-7 h-7 object-contain shrink-0 mb-1"
            />
            <div className="px-4 py-3 rounded-2xl bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      {/* Fixed Bottom Input Bar (Directly pinned at the bottom - NO NAVBAR) */}
      <footer className="shrink-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-t border-black/5 dark:border-white/10 px-3 sm:px-6 pt-2 pb-4 sm:pb-5">
        <div className="max-w-3xl mx-auto w-full space-y-2">
          {/* Quick Prompts Chips */}
          <div className="overflow-x-auto flex items-center gap-1.5 no-scrollbar py-0.5">
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(qp)}
                className="px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold whitespace-nowrap active:scale-95 transition-all shrink-0"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Form Input + Send */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                lang === 'ar'
                  ? 'اسأل المرشد أي سؤال عن أرضك، الري، أو الدورة الزراعية...'
                  : 'Ask your farm advisor anything...'
              }
              className="flex-1 min-w-0 px-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-600 border-0"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isChatLoading}
              className="w-11 h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 shadow-md active:scale-95 transition-all"
              title="Send"
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
