'use client';

import React from 'react';
import { Language } from '@/lib/types';
import { UserProfile } from './AuthGateway';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  lang: Language;
  farmAcreage: number;
  fieldName: string;
  onLogout: () => void;
  onOpenFarmSetup: () => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  user,
  lang,
  farmAcreage,
  fieldName,
  onLogout,
  onOpenFarmSetup,
}: ProfileModalProps) {
  if (!isOpen) return null;

  const defaultName = lang === 'ar' ? 'م. محمود الشربيني' : 'M. Sherbini';
  const defaultEmail = user?.email || 'farmer@blinkfarms.eg';
  const displayName = user?.name || defaultName;

  return (
    <div className="fixed inset-0 z-[4000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div
        className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-black/5 dark:border-white/10 space-y-5 animate-slideUp relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 rtl:left-auto rtl:right-4 w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-500 hover:text-black dark:hover:text-white flex items-center justify-center text-sm font-bold transition-all"
        >
          ✕
        </button>

        {/* User Avatar & Name */}
        <div className="text-center pt-2 space-y-2">
          <div className="relative w-16 h-16 mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-neutral-100 dark:bg-neutral-800 text-white font-extrabold text-2xl flex items-center justify-center shadow-md border border-black/5 dark:border-white/10">
              👨‍🌾
            </div>
            <img
              src="/logo.png"
              alt="BlinkFarms"
              className="w-7 h-7 object-contain absolute -bottom-1 -right-1 drop-shadow-md"
            />
          </div>

          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              {displayName}
            </h3>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">
              {defaultEmail}
            </p>
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            {lang === 'ar' ? 'مزارع معتمد (BlinkFarms)' : 'Verified Farmer'}
          </span>
        </div>

        {/* Farm & Account Overview */}
        <div className="space-y-2.5 pt-2 border-t border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-neutral-400 font-medium">
              {lang === 'ar' ? 'المساحة المسجلة:' : 'Registered Acreage:'}
            </span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200">
              {farmAcreage} {lang === 'ar' ? 'فدان' : 'feddans'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-neutral-400 font-medium">
              {lang === 'ar' ? 'الحقل الحالي:' : 'Current Field:'}
            </span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate max-w-[170px]">
              {fieldName}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-neutral-400 font-medium">
              {lang === 'ar' ? 'حالة الربط:' : 'Sync Status:'}
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {lang === 'ar' ? 'نشط مع الأقمار الصناعية' : 'Satellite Active'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 space-y-2">
          <button
            onClick={() => {
              onClose();
              onOpenFarmSetup();
            }}
            className="w-full py-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-xs font-bold text-neutral-800 dark:text-neutral-200 transition-all active:scale-95"
          >
            {lang === 'ar' ? '🌾 تغيير أو تحديد حقل آخر' : '🌾 Change Field Location'}
          </button>

          <button
            onClick={onLogout}
            className="w-full py-2.5 rounded-2xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-xs font-bold text-red-600 dark:text-red-400 transition-all active:scale-95"
          >
            {lang === 'ar' ? 'تسجيل الخروج' : 'Log Out'}
          </button>
        </div>
        {/* Footer Brand Info */}
        <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-neutral-400 font-medium">
          <img src="/logo.png" alt="BlinkFarms" className="w-4 h-4 object-contain" />
          <span>BlinkFarms — NASA FieldShift & VeloceRoot</span>
        </div>
      </div>
    </div>
  );
}
