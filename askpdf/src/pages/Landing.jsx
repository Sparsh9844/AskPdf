import { Link } from 'react-router-dom';
import {
  ArrowRight, Brain, ListTree, Search, PenLine, ShieldCheck, Check, X, FileText, Sparkles,
  BookOpen, Layers, GraduationCap, NotebookPen, Network, Upload, MessageSquare, XCircle,
  CheckCircle2, AlertTriangle, Lock, Quote,
} from 'lucide-react';
import Logo from '../components/auth/Logo';
import { useAuth } from '../hooks/useAuth';

const rise = (delay) => ({ animation: 'slideUp .6s ease-out both', animationDelay: `${delay}ms` });

// ── Product preview (static mock of a real research turn) ────────────────────

function Cite({ n, active }) {
  return (
    <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 mx-0.5 -translate-y-px rounded-md text-[10px] font-bold align-baseline ${active ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700'}`}>
      {n}
    </span>
  );
}

const TRACE = [
  { icon: Brain,    label: 'Understanding the question', detail: 'Interpreted as: “How did margins change in 2024 vs 2023?”' },
  { icon: ListTree, label: 'Planned 3 lines of inquiry',  detail: 'gross margin 2024 · operating costs · pricing changes' },
  { icon: Search,   label: 'Searching 2 documents',       detail: 'Found 8 relevant passages · pages 4, 7, 12, 31' },
  { icon: PenLine,  label: 'Writing a cited answer',      detail: 'Cited 6 of 8 passages' },
];

function ProductPreview() {
  return (
    <div className="relative" style={rise(250)}>
      <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-200/60 via-violet-200/40 to-transparent rounded-[2rem] blur-2xl" aria-hidden />
      <div className="relative rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-indigo-900/10 overflow-hidden">
        {/* window chrome */}
        <div className="flex items-center gap-2 px-4 h-10 border-b border-gray-100 bg-gray-50/80">
          <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
          <div className="ml-3 flex items-center gap-1.5 text-[11px] text-gray-500">
            <Layers className="w-3 h-3 text-indigo-500" /> Annual Report 2024.pdf · Annual Report 2023.pdf
          </div>
        </div>

        <div className="grid sm:grid-cols-[1fr_200px]">
          <div className="p-5 space-y-4">
            <div className="flex justify-end">
              <p className="px-3.5 py-2 rounded-2xl rounded-tr-sm bg-gray-900 text-white text-[13px] max-w-[85%]">
                How did margins change, and why?
              </p>
            </div>

            <ol className="space-y-2.5 pl-1">
              {TRACE.map(({ icon: Icon, label, detail }, i) => (
                <li key={label} className="flex gap-2.5" style={rise(500 + i * 220)}>
                  <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-2.5 h-2.5 text-indigo-600" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-gray-800">{label}</p>
                    <p className="text-[10px] text-gray-500 truncate">{detail}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="rounded-2xl rounded-tl-sm border border-gray-200 p-3.5 text-[13px] leading-relaxed text-gray-700" style={rise(1450)}>
              Gross margin rose from <b className="text-gray-900">41% to 46%</b><Cite n={1} /><Cite n={2} />, mainly because
              cloud costs fell after the infrastructure migration<Cite n={3} active />. Price increases contributed less
              than expected<Cite n={5} />.
              <div className="flex items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                  <ShieldCheck className="w-3 h-3" /> Well grounded · 6 cited
                </span>
              </div>
            </div>
          </div>

          {/* evidence panel */}
          <div className="hidden sm:block border-l border-gray-100 bg-gray-50/60 p-3 space-y-2" style={rise(1650)}>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 px-1">
              <BookOpen className="w-3 h-3 text-indigo-600" /> Evidence
            </p>
            {[
              { n: 3, doc: 'Annual Report 2024', p: 12, t: 'Following the migration, hosting costs declined 23% year over year…', active: true },
              { n: 1, doc: 'Annual Report 2024', p: 4,  t: 'Gross margin for the year was 46%, compared with…' },
              { n: 2, doc: 'Annual Report 2023', p: 7,  t: 'We closed the year with a gross margin of 41%…' },
            ].map(s => (
              <div key={s.n} className={`p-2 rounded-lg border bg-white ${s.active ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-gray-200'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-4 h-4 rounded bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">{s.n}</span>
                  <span className="text-[10px] text-gray-600 truncate">{s.doc}</span>
                  <span className="ml-auto text-[9px] text-gray-400">p.{s.p}</span>
                </div>
                <p className="text-[10px] text-gray-500 leading-snug line-clamp-2">{s.t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sections ──────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Brain,         title: 'Visible research, not a black box', body: 'Watch every step: how your question was understood, the sub-questions planned, and which passages were found.' },
  { icon: BookOpen,      title: 'Citations to the exact page',      body: 'Every claim carries a numbered citation. Hover to preview the passage; click to open it. Page numbers are real, not estimated.' },
  { icon: ShieldCheck,   title: 'Grounding you can trust',           body: 'Each answer is scored for how well it is supported, and says plainly when your documents don’t cover a question.' },
  { icon: Sparkles,      title: 'Instant intelligence briefs',      body: 'Every upload gets a summary, key takeaways, important figures, people and organisations, and questions worth asking.' },
  { icon: Layers,        title: 'Research across documents',        body: 'Compare contracts, reports or papers side by side. Answers draw from each document and cite which one said what.' },
  { icon: ShieldCheck,   title: 'Fact-check any text',              body: 'Paste an email, essay or AI answer. Each claim is checked against your sources and flagged if contradicted.' },
  { icon: GraduationCap, title: 'Study mode',                       body: 'Generate quizzes from any document or topic, with explanations and the page to revisit for every answer.' },
  { icon: NotebookPen,   title: 'Notebook and cited reports',       body: 'Save findings with their citations and export a properly referenced Markdown report in one click.' },
  { icon: Network,       title: 'Knowledge map',                    body: 'See the topics across your whole library and jump straight into comparing the documents that share them.' },
];

const STEPS = [
  { icon: Upload,        title: 'Upload',          body: 'PDF, Word, Excel, CSV, Markdown or text. Each page is read and indexed separately.' },
  { icon: Sparkles,      title: 'Insight reads it', body: 'You get an intelligence brief in seconds, plus suggested questions to start with.' },
  { icon: MessageSquare, title: 'Ask and verify',   body: 'Get cited answers, check claims, study, and export what you learn as a report.' },
];

const COMPARE = [
  ['Cites the exact page for each claim',          false, true],
  ['Shows how the answer was researched',          false, true],
  ['Tells you how well an answer is supported',    false, true],
  ['Says “not in your documents” instead of guessing', false, true],
  ['Compares several documents in one question',   false, true],
  ['Checks other text against your sources',       false, true],
  ['Summaries, quizzes and exportable reports',    false, true],
];

const CLAIMS = [
  { verdict: 'supported',    icon: CheckCircle2,  cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', label: 'Supported',    claim: 'The system uses a Raspberry Pi as its controller.', note: 'Stated on page 2 [1].' },
  { verdict: 'contradicted', icon: XCircle,       cls: 'text-red-700 bg-red-50 border-red-200',             label: 'Contradicted', claim: 'One unit equals 1,000 LED blinks.', note: 'The paper says 3,200 blinks per unit [2].' },
  { verdict: 'partial',      icon: AlertTriangle, cls: 'text-amber-700 bg-amber-50 border-amber-200',       label: 'Partially supported', claim: 'Users can pay in advance and get SMS alerts.', note: 'Prepaid is described [3]; SMS alerts are not.' },
];

export default function Landing() {
  const { status } = useAuth();
  const signedIn = status === 'authenticated';
  const primary = signedIn
    ? { to: '/dashboard', label: 'Open your workspace' }
    : { to: '/signup',    label: 'Get started free' };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center gap-6 px-4 sm:px-6 h-16">
          <Logo />
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900">Features</a>
            <a href="#how" className="hover:text-gray-900">How it works</a>
            <a href="#compare" className="hover:text-gray-900">Why Insight</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {signedIn ? (
              <Link to="/dashboard" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800">
                Open app <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="h-9 px-3 inline-flex items-center text-sm font-medium text-gray-700 hover:text-gray-900">Sign in</Link>
                <Link to="/signup" className="h-9 px-4 inline-flex items-center rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[36rem] bg-gradient-to-b from-indigo-50/80 to-transparent" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 lg:pt-24 grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-indigo-100 text-xs font-medium text-indigo-700 shadow-sm" style={rise(0)}>
              <Sparkles className="w-3.5 h-3.5" /> Document intelligence, not just a chatbot
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold tracking-tight leading-[1.08]" style={rise(80)}>
              Ask your documents.<br />
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Get answers you can prove.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl" style={rise(160)}>
              Insight researches your PDFs, reports and notes step by step, cites the exact page behind every claim,
              and tells you when the answer isn’t there. You don’t have to trust a black box.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3" style={rise(240)}>
              <Link to={primary.to} className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-indigo-600 text-white font-medium shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors">
                {primary.label} <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#how" className="inline-flex items-center h-12 px-5 rounded-xl border border-gray-200 bg-white font-medium text-gray-700 hover:bg-gray-50">
                See how it works
              </a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500" style={rise(320)}>
              {['Page-level citations', 'Multi-document research', 'Your data stays yours'].map(t => (
                <li key={t} className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> {t}</li>
              ))}
            </ul>
          </div>
          <ProductPreview />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-24 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-indigo-600">Beyond “chat with your PDF”</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">A research workspace for everything you read</h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Most document chatbots give you a confident paragraph and hope you believe it. Insight shows its work.
            </p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="group p-6 rounded-2xl border border-gray-200 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-900/5 transition-all">
                <span className="w-10 h-10 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 flex items-center justify-center transition-colors">
                  <Icon className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors" />
                </span>
                <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 sm:py-24 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-semibold text-indigo-600">How it works</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">From file to verified answer in minutes</h2>
          </div>
          <div className="mt-14 grid md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-7 left-[16%] right-[16%] h-px bg-gradient-to-r from-indigo-200 via-indigo-300 to-indigo-200" aria-hidden />
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <div key={title} className="relative text-center">
                <span className="relative z-10 mx-auto w-14 h-14 rounded-2xl bg-white border border-indigo-100 shadow-sm flex items-center justify-center">
                  <Icon className="w-6 h-6 text-indigo-600" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                </span>
                <h3 className="mt-5 font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compare + fact-check spotlight */}
      <section id="compare" className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-sm font-semibold text-indigo-600">Why Insight</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">Built for when being right matters</h2>
            <div className="mt-8 rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="text-left font-medium px-4 py-3">Capability</th>
                    <th className="font-medium px-3 py-3 w-28">Typical PDF chat</th>
                    <th className="font-semibold px-3 py-3 w-24 text-indigo-700">Insight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {COMPARE.map(([label, them, us]) => (
                    <tr key={label}>
                      <td className="px-4 py-3 text-gray-700">{label}</td>
                      <td className="px-3 py-3 text-center">{them ? <Check className="w-4 h-4 text-gray-400 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />}</td>
                      <td className="px-3 py-3 text-center">{us && <span className="inline-flex w-6 h-6 rounded-full bg-emerald-50 items-center justify-center"><Check className="w-4 h-4 text-emerald-600" /></span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:pt-20">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5 p-6">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" /> Fact-check
                </p>
                <span className="text-xs text-gray-500">Accuracy <b className="text-gray-900">50%</b></span>
              </div>
              <div className="flex h-2 mt-4 rounded-full overflow-hidden bg-gray-100">
                <div className="bg-emerald-500 w-1/3" /><div className="bg-amber-400 w-1/3" /><div className="bg-red-500 w-1/3" />
              </div>
              <div className="mt-5 space-y-3">
                {CLAIMS.map(({ icon: Icon, cls, label, claim, note }) => (
                  <div key={claim} className="p-3.5 rounded-xl border border-gray-100">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-800">{claim}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold flex-shrink-0 ${cls}`}>
                        <Icon className="w-3 h-3" /> {label}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500">{note}</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 flex items-start gap-2 text-sm text-gray-500">
              <Quote className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-300" />
              Paste any text and see which claims your documents back up and which they contradict.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-6xl mx-auto relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-700 px-6 py-14 sm:px-14 text-center">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-indigo-500/30 blur-3xl" aria-hidden />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-violet-500/20 blur-3xl" aria-hidden />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">Stop guessing what your documents say</h2>
            <p className="mt-4 text-indigo-200 max-w-xl mx-auto">
              Upload your first file and get a cited brief in under a minute.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to={primary.to} className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-white text-indigo-900 font-semibold hover:bg-indigo-50">
                {primary.label} <ArrowRight className="w-4 h-4" />
              </Link>
              {!signedIn && (
                <Link to="/login" className="inline-flex items-center h-12 px-6 rounded-xl border border-white/25 text-white font-medium hover:bg-white/10">
                  I have an account
                </Link>
              )}
            </div>
            <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-indigo-300">
              <Lock className="w-3.5 h-3.5" /> Accounts are stored in your own database. Passwords are hashed with bcrypt.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <Logo />
          <p className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> PDF · DOCX · XLSX · CSV · TXT · MD</p>
          <p>© {new Date().getFullYear()} Insight</p>
        </div>
      </footer>
    </div>
  );
}
