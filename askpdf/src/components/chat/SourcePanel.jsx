import { useEffect, useRef } from 'react';
import { BookOpen, X, FileText } from 'lucide-react';
import clsx from 'clsx';

/**
 * SourcePanel — the passages retrieved for one answer.
 * Cited passages come first; the active one is expanded and scrolled into view.
 *
 * Props:
 *   sources      — the message's sources (each with index, cited, snippet, page…)
 *   activeIndex  — citation number currently highlighted
 *   onSelect     — (source) => void
 *   onClose
 */
export default function SourcePanel({ sources, activeIndex, onSelect, onClose }) {
  const itemRefs = useRef({});

  useEffect(() => {
    if (activeIndex != null) {
      itemRefs.current[activeIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeIndex]);

  if (!sources?.length) return null;

  const ordered = [...sources].sort((a, b) =>
    (b.cited === true) - (a.cited === true) || (a.index ?? 0) - (b.index ?? 0)
  );
  const citedCount = sources.filter(s => s.cited).length;

  return (
    <aside className="flex flex-col h-full bg-white border-l border-gray-200 w-[320px] flex-shrink-0 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" strokeWidth={1.75} />
          <span className="text-sm font-semibold text-gray-900">Evidence</span>
          <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
            {citedCount ? `${citedCount}/${sources.length} cited` : sources.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Close evidence panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Source list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {ordered.map((src) => {
          const active = activeIndex === src.index;
          return (
            <button
              key={src.index ?? src.id}
              ref={el => { itemRefs.current[src.index] = el; }}
              onClick={() => onSelect?.(src)}
              className={clsx(
                'w-full text-left p-3 rounded-xl border transition-all duration-150',
                active
                  ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500'
                  : src.cited
                    ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    : 'border-gray-100 opacity-70 hover:opacity-100'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={clsx(
                  'w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                  active || src.cited ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                )}>
                  {src.index}
                </span>
                <FileText className="w-3 h-3 text-red-400 flex-shrink-0" />
                <span className="text-[11px] font-medium text-gray-700 truncate flex-1">{src.documentName}</span>
              </div>

              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                  {src.pageEnd && src.pageEnd !== src.pageNumber
                    ? `Pages ${src.pageNumber}–${src.pageEnd}` : `Page ${src.pageNumber}`}
                </span>
                <span className="text-[10px] text-gray-500 tabular-nums">
                  {Math.round((src.score ?? 0) * 100)}% match
                </span>
                {!src.cited && (
                  <span className="text-[10px] text-gray-400 ml-auto">not cited</span>
                )}
              </div>

              <p className={clsx(
                'text-[11px] leading-relaxed whitespace-pre-line',
                active ? 'text-gray-700' : 'text-gray-500 line-clamp-3'
              )}>
                {src.snippet}
              </p>
            </button>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
        <p className="text-[11px] text-gray-400 text-center">
          Numbers match the citations in the answer
        </p>
      </div>
    </aside>
  );
}
