import { useState } from 'react';
import clsx from 'clsx';

/**
 * Citation — inline [n] chip inside an answer. Hover previews the passage,
 * click opens it in the source panel.
 */
export default function Citation({ n, source, onClick, active }) {
  const [hover, setHover] = useState(false);

  if (!source) {
    return <span className="text-[10px] text-gray-400 align-super">[{n}]</span>;
  }

  return (
    <span
      className="relative inline-block align-baseline"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        onClick={() => onClick?.(source)}
        className={clsx(
          'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 -translate-y-px rounded-md text-[10px] font-semibold tabular-nums transition-colors',
          active
            ? 'bg-indigo-600 text-white'
            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white'
        )}
        aria-label={`Source ${n}: ${source.documentName}, page ${source.pageNumber}`}
      >
        {n}
      </button>

      {hover && (
        <span className="absolute z-40 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 rounded-xl bg-white border border-gray-200 shadow-xl text-left animate-fade-in pointer-events-none">
          <span className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-semibold text-gray-800 truncate">{source.documentName}</span>
            <span className="text-[10px] text-gray-500 flex-shrink-0">
              p.{source.pageNumber}{source.pageEnd && source.pageEnd !== source.pageNumber ? `–${source.pageEnd}` : ''}
            </span>
          </span>
          <span className="block text-[11px] leading-relaxed text-gray-600 line-clamp-5">{source.snippet}</span>
          <span className="block mt-1.5 text-[10px] text-indigo-600 font-medium">Click to open passage</span>
        </span>
      )}
    </span>
  );
}
