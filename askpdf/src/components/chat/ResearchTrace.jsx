import { useState } from 'react';
import {
  Brain, ListTree, Search, PenLine, ShieldCheck, Check, Loader2, ChevronDown, ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

const ICONS = {
  understand: Brain,
  plan:       ListTree,
  retrieve:   Search,
  synthesize: PenLine,
  verify:     ShieldCheck,
};

function Step({ step, live, last }) {
  const Icon    = ICONS[step.kind] ?? Search;
  const running = step.status === 'running';

  return (
    <li className="relative flex gap-3 pb-3 last:pb-0">
      {/* rail */}
      {!last && <span className="absolute left-[11px] top-6 bottom-0 w-px bg-gray-200" aria-hidden />}
      <span className={clsx(
        'relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border',
        running ? 'bg-white border-indigo-300' : 'bg-indigo-50 border-indigo-100'
      )}>
        {running
          ? <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />
          : live ? <Check className="w-3 h-3 text-indigo-600" strokeWidth={2.5} /> : <Icon className="w-3 h-3 text-indigo-600" />}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center gap-2">
          <span className={clsx('text-xs font-medium', running ? 'text-gray-900' : 'text-gray-700')}>{step.label}</span>
          {!running && step.durationMs != null && (
            <span className="text-[10px] text-gray-400 tabular-nums">{formatMs(step.durationMs)}</span>
          )}
        </div>
        {step.detail && <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{step.detail}</p>}
        {step.items?.length > 0 && (
          <ul className="mt-1.5 space-y-1">
            {step.items.map((it, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-indigo-300 flex-shrink-0" />
                <span className="leading-relaxed">{it}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

const formatMs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);

/**
 * ResearchTrace — the steps the research engine took for an answer.
 *
 * live=true   → expanded, animated, updates as steps stream in
 * live=false  → collapsed summary ("Researched in 5 steps · 2.4s"), expandable
 */
export default function ResearchTrace({ trace = [], live = false, mode }) {
  const [open, setOpen] = useState(false);
  if (!trace.length) return null;

  const total = trace.reduce((s, t) => s + (t.durationMs ?? 0), 0);

  if (live) {
    return (
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-indigo-100 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500 mb-2.5">
          {mode === 'deep' ? 'Deep research' : 'Researching'}
        </p>
        <ol>{trace.map((s, i) => <Step key={s.id ?? s.kind} step={s} live last={i === trace.length - 1} />)}</ol>
      </div>
    );
  }

  return (
    <div className="w-full">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-indigo-600 transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <Brain className="w-3 h-3" />
        {mode === 'deep' ? 'Deep research' : 'Researched'} in {trace.length} steps · {formatMs(total)}
      </button>
      {open && (
        <div className="mt-2 px-3 py-3 rounded-xl bg-gray-50 border border-gray-200 animate-slide-up">
          <ol>{trace.map((s, i) => <Step key={i} step={{ ...s, status: 'done' }} last={i === trace.length - 1} />)}</ol>
        </div>
      )}
    </div>
  );
}
