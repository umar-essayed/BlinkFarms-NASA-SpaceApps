'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Language } from '@/lib/types';
import OnboardingStory from '@/components/OnboardingStory';

export default function OnboardingPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('ar');

  useEffect(() => {
    const savedLang = localStorage.getItem('blinkfarms_lang') as Language;
    if (savedLang) setLang(savedLang);
  }, []);

  const handleFinish = () => {
    localStorage.setItem('blinkfarms_story_v3', 'true');
    router.push('/login');
  };

  return (
    <main className="min-h-screen w-full bg-black">
      <OnboardingStory lang={lang} onFinish={handleFinish} />
    </main>
  );
}
