import { ShieldCheck, ShieldAlert, ShieldQuestion, ShieldOff } from 'lucide-react';
import clsx from 'clsx';

const LEVELS = {
  high:   { label: 'Well grounded',      icon: ShieldCheck,    cls: 'text-emerald-700 bg-emerald-50 border-emerald-200',
            tip: 'Almost every statement is backed by a cited passage.' },
  medium: { label: 'Partially grounded', icon: ShieldQuestion, cls: 'text-amber-700 bg-amber-50 border-amber-200',
            tip: 'Some statements lack citations or rely on weak matches — verify key facts.' },
  low:    { label: 'Weakly grounded',    icon: ShieldAlert,    cls: 'text-red-700 bg-red-50 border-red-200',
            tip: 'Few claims are backed by the documents. Treat with caution.' },
  none:   { label: 'Not in documents',   icon: ShieldOff,      cls: 'text-gray-600 bg-gray-100 border-gray-200',
            tip: 'The documents don’t appear to cover this question.' },
};

/**
 * GroundingBadge — how well an answer is supported by its cited sources.
 */
export default function GroundingBadge({ grounding }) {
  const meta = LEVELS[grounding?.level];
  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <span
      title={meta.tip}
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium cursor-default',
        meta.cls
      )}
    >
      <Icon className="w-3 h-3" />
      {meta.label}
      {grounding.citedCount > 0 && <span className="opacity-70">· {grounding.citedCount} cited</span>}
    </span>
  );
}
