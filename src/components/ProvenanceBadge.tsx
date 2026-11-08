import React from 'react';
import { DataState, QualityStatus } from '@/lib/provenanceTypes';

interface ProvenanceBadgeProps {
  state: DataState;
  quality?: QualityStatus;
  source?: string;
  timestamp?: string;
  resolution?: string;
  lang?: 'ar' | 'en';
}

export default function ProvenanceBadge({
  state,
  quality = 'measured_high',
  source,
  timestamp,
  resolution,
  lang = 'ar',
}: ProvenanceBadgeProps) {
  const getBadgeStyle = () => {
    switch (state) {
      case 'LIVE':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'HISTORICAL':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'ESTIMATED':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'SIMULATED':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'USER_INPUT':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      default:
        return 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20';
    }
  };

  const getLabel = () => {
    if (lang === 'ar') {
      switch (state) {
        case 'LIVE': return 'رصد حي ومباشر 🟢';
        case 'HISTORICAL': return 'أرشيف مناخي تاريخي 🔵';
        case 'ESTIMATED': return 'تقدير فيزيائي موثوق 🟡';
        case 'SIMULATED': return 'محاكاة ديناميكية 🟣';
        case 'USER_INPUT': return 'مدخلات المزارع الحقلية 👤';
      }
    }
    return state;
  };

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border tracking-wide font-mono ${getBadgeStyle()}`}
      >
        <span>{getLabel()}</span>
        {quality === 'synthetic_fixture' && <span title="Synthetic Benchmark">🧪</span>}
      </span>
      {source && (
        <span className="text-[10px] text-neutral-400 font-medium font-sans">
          {source} {resolution ? `(${resolution})` : ''}
        </span>
      )}
      {timestamp && (
        <span className="text-[10px] text-neutral-400 font-mono">
          {new Date(timestamp).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
        </span>
      )}
    </div>
  );
}
