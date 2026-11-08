'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownMessageProps {
  content: string;
}

export default function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-inherit leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-neutral-900 dark:text-white">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc pr-4 pl-4 mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pr-4 pl-4 mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-inherit leading-normal">{children}</li>,
          h3: ({ children }) => <h3 className="text-sm font-bold text-neutral-900 dark:text-white mt-2 mb-1">{children}</h3>,
          h4: ({ children }) => <h4 className="text-xs font-bold text-neutral-900 dark:text-white mt-1 mb-1">{children}</h4>,
          blockquote: ({ children }) => (
            <blockquote className="border-r-2 border-l-2 border-blue-500/40 px-2.5 py-1 my-1 italic bg-blue-500/5 rounded-r">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 text-xs font-mono rounded bg-black/10 dark:bg-white/10 text-blue-600 dark:text-blue-400">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
