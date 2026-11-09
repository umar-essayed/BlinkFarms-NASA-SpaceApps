'use client';

import React, { useState } from 'react';
import { ToolInvocation, Language } from '@/lib/types';

interface ToolExecutionBadgeProps {
  tool: ToolInvocation;
  lang: Language;
}

export default function ToolExecutionBadge({ tool, lang }: ToolExecutionBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getToolIcon = (name: string) => {
    switch (name) {
      case 'simulate_crop_scenario':
        return '🧬';
      case 'run_topsis_rotation_optimizer':
        return '⚖️';
      case 'fetch_nasa_drought_telemetry':
        return '🛰️';
      case 'query_ithmar_knowledge_base':
        return '🌱';
      case 'update_field_parameters':
        return '⚙️';
      default:
        return '⚡';
    }
  };

  const label = lang === 'ar' ? tool.labelAr : tool.labelEn;
  const summary = lang === 'ar' ? tool.summaryAr : tool.summaryEn;

  return (
    <div className="inline-block max-w-full">
      {/* Clickable Pill Badge */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all border select-none active:scale-95 ${
          isExpanded
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
            : 'bg-white/5 hover:bg-white/10 text-neutral-300 border-white/10'
        }`}
        title={lang === 'ar' ? 'اضغط لعرض مدخلات ومخرجات الأداة' : 'Click to inspect tool telemetry'}
      >
        <span className="text-xs">{getToolIcon(tool.name)}</span>
        <span className="truncate">{label}</span>
        <span className="text-[9px] opacity-70 ml-0.5">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {/* Expandable Parameter & Telemetry Drawer */}
      {isExpanded && (
        <div className="mt-1.5 p-3 rounded-2xl bg-black/60 border border-emerald-500/30 text-neutral-200 text-[11px] space-y-2 animate-fadeIn max-w-full overflow-hidden">
          {/* Summary Callout */}
          {summary && (
            <p className="font-semibold text-emerald-400 leading-snug">
              {summary}
            </p>
          )}

          {/* Input & Output Breakdown */}
          <div className="grid grid-cols-1 gap-2 pt-1 border-t border-white/10 text-[10px] font-mono">
            {tool.input && (
              <div>
                <span className="text-neutral-400 block font-bold mb-0.5">
                  {lang === 'ar' ? 'المدخلات (Input Parameters):' : 'Input Parameters:'}
                </span>
                <pre className="p-2 rounded-xl bg-black/40 border border-white/5 text-neutral-300 overflow-x-auto text-[9.5px]">
                  {JSON.stringify(tool.input, null, 2)}
                </pre>
              </div>
            )}

            {tool.output && (
              <div>
                <span className="text-neutral-400 block font-bold mb-0.5">
                  {lang === 'ar' ? 'المخرجات الحسابية (Engine Output):' : 'Engine Output:'}
                </span>
                <pre className="p-2 rounded-xl bg-black/40 border border-white/5 text-emerald-300 overflow-x-auto text-[9.5px]">
                  {JSON.stringify(tool.output, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
