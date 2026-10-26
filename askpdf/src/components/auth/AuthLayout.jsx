import { ShieldCheck, Quote } from 'lucide-react';
import Logo from './Logo';

/**
 * AuthLayout — split screen: product story on the left, form on the right.
 */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Brand panel */}
      <aside className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12 bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-700 text-white">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-indigo-500/30 blur-3xl" aria-hidden />
        <div className="absolute -bottom-40 -left-20 w-[28rem] h-[28rem] rounded-full bg-violet-500/20 blur-3xl" aria-hidden />

        <Logo light className="relative" />

        <div className="relative space-y-6 max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Answers you can verify,<br />from documents you trust.
          </h2>
          <p className="text-indigo-200 leading-relaxed">
            Insight researches your files step by step and cites the exact page behind every claim.
          </p>

          {/* Sample cited answer */}
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 p-5 space-y-3 shadow-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-200">Research answer</p>
            <p className="text-sm leading-relaxed text-white/90">
              Revenue grew <span className="font-semibold text-white">18% year over year</span>
              <Cite n={1} />, driven mainly by the enterprise segment <Cite n={2} />.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[11px] font-medium">
                <ShieldCheck className="w-3 h-3" /> Well grounded
              </span>
              <span className="text-[11px] text-indigo-200">Annual Report · p. 4, p. 12</span>
            </div>
          </div>
        </div>

        <div className="relative flex items-start gap-3 text-sm text-indigo-200 max-w-md">
          <Quote className="w-5 h-5 flex-shrink-0 text-indigo-300" />
          <p>Your account and documents stay in your own database. Nothing is shared with other users.</p>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <Logo className="lg:hidden mb-10" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 mt-1.5">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-sm text-gray-500 text-center">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}

function Cite({ n }) {
  return (
    <span className="inline-flex items-center justify-center w-[18px] h-[18px] mx-0.5 -translate-y-px rounded-md bg-indigo-400/30 text-[10px] font-bold text-white align-baseline">
      {n}
    </span>
  );
}
