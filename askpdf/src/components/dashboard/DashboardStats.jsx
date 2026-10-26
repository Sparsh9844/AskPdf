import { FileText, MessageSquare, ShieldCheck, Zap } from 'lucide-react';
import clsx from 'clsx';

const statCards = [
  {
    key: 'totalDocuments',
    label: 'Documents',
    icon: FileText,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    format: (v) => v,
    sub: (_v, s) => `${s.processedDocuments ?? 0} ready · ${(s.totalChunks ?? 0).toLocaleString()} passages`,
  },
  {
    key: 'totalQuestions',
    label: 'Questions answered',
    icon: MessageSquare,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    format: (v) => (v ?? 0).toLocaleString(),
    sub: (_v, s) => `across ${s.totalConversations ?? 0} conversations`,
  },
  {
    key: 'groundedRate',
    label: 'Grounded answers',
    icon: ShieldCheck,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    format: (v) => (v == null ? '—' : `${v}%`),
    sub: (v) => (v == null ? 'no answers yet' : 'backed by cited passages'),
  },
  {
    key: 'avgResponseTimeMs',
    label: 'Avg research time',
    icon: Zap,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    format: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v ?? 0}ms`),
    sub: () => 'question to cited answer',
  },
];

/**
 * DashboardStats — row of KPI cards
 */
export default function DashboardStats({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map(({ key, label, icon: Icon, color, bg, format, sub }) => (
        <div
          key={key}
          className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">{label}</span>
            <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', bg)}>
              <Icon className={clsx('w-4 h-4', color)} strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{format(stats[key])}</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{sub(stats[key], stats)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
