import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import clsx from 'clsx';

export default function Logo({ to = '/', light = false, className }) {
  return (
    <Link to={to} className={clsx('inline-flex items-center gap-2.5', className)}>
      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-sm">
        <Sparkles className="w-4 h-4 text-white" strokeWidth={2} />
      </span>
      <span className={clsx('font-semibold text-[17px] tracking-tight', light ? 'text-white' : 'text-gray-900')}>Insight</span>
    </Link>
  );
}
