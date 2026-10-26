import { useNavigate } from 'react-router-dom';
import { MessageSquare, ShieldCheck, GraduationCap, NotebookPen, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

const TOOLS = [
  { to: '/chat',     icon: MessageSquare, title: 'Research',   desc: 'Cited answers across your documents, step by step', tint: 'from-indigo-500 to-indigo-700' },
  { to: '/verify',   icon: ShieldCheck,   title: 'Fact-check', desc: 'Paste any text and verify every claim',                tint: 'from-emerald-500 to-emerald-700' },
  { to: '/study',    icon: GraduationCap, title: 'Study',      desc: 'Quizzes with explanations and page references',        tint: 'from-violet-500 to-violet-700' },
  { to: '/notebook', icon: NotebookPen,   title: 'Notebook',   desc: 'Saved findings, exportable as a referenced report',    tint: 'from-amber-500 to-orange-600', countKey: 'totalNotes' },
];

/**
 * ToolLauncher — the workspace's four ways of working with documents.
 */
export default function ToolLauncher({ stats }) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {TOOLS.map(({ to, icon: Icon, title, desc, tint, countKey }) => (
        <button
          key={to}
          onClick={() => navigate(to)}
          className="group text-left flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all"
        >
          <div className={clsx('w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0', tint)}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              {title}
              {countKey && stats?.[countKey] > 0 && (
                <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 rounded-full px-1.5">{stats[countKey]}</span>
              )}
              <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all ml-auto" />
            </p>
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
