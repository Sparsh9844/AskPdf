import { useState, useRef, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck, CheckCircle2, XCircle, AlertTriangle, HelpCircle, Loader2, Square,
  ChevronDown, ChevronRight, FileText, Wand2,
} from 'lucide-react';
import clsx from 'clsx';
import Header from '../components/layout/Header';
import Button from '../components/ui/Button';
import ScopeBar from '../components/chat/ScopeBar';
import { AnswerBody } from '../components/chat/ChatMessage';
import SaveNoteButton from '../components/notebook/SaveNoteButton';
import { useDocuments } from '../hooks/useDocuments';
import { verifyApi } from '../services/api';

const MAX_CHARS = 6000;

const VERDICTS = {
  supported:           { label: 'Supported',           icon: CheckCircle2,  cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', bar: 'bg-emerald-500' },
  partially_supported: { label: 'Partially supported', icon: AlertTriangle, cls: 'text-amber-700 bg-amber-50 border-amber-200',       bar: 'bg-amber-400'   },
  contradicted:        { label: 'Contradicted',        icon: XCircle,       cls: 'text-red-700 bg-red-50 border-red-200',             bar: 'bg-red-500'     },
  not_found:           { label: 'Not in documents',    icon: HelpCircle,    cls: 'text-gray-600 bg-gray-100 border-gray-200',         bar: 'bg-gray-300'    },
};

function ClaimCard({ result, pending, claim, n }) {
  const [open, setOpen] = useState(false);

  if (pending) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
        <span className="w-6 h-6 rounded-md bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">{n}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800">{claim}</p>
          <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
            <Loader2 className="w-3 h-3 animate-spin" /> Checking against your documents…
          </p>
        </div>
      </div>
    );
  }

  const v = VERDICTS[result.verdict] ?? VERDICTS.not_found;
  const Icon = v.icon;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 animate-slide-up">
      <div className="flex items-start gap-3">
        <span className="w-6 h-6 rounded-md bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">{n}</span>
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-gray-900">{result.claim}</p>
            <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold flex-shrink-0', v.cls)}>
              <Icon className="w-3 h-3" /> {v.label}
            </span>
          </div>

          {result.explanation && (
            <div className="text-gray-600">
              <AnswerBody content={result.explanation} sources={result.sources} />
            </div>
          )}

          {result.correction && (
            <div className="rounded-lg bg-amber-50/70 border border-amber-100 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 mb-1">What the documents say</p>
              <AnswerBody content={result.correction} sources={result.sources} />
            </div>
          )}

          {result.sources?.length > 0 && (
            <div>
              <button
                onClick={() => setOpen(o => !o)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-indigo-600"
              >
                {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {result.sources.length} passages examined
              </button>
              {open && (
                <div className="mt-2 space-y-1.5">
                  {result.sources.map(s => (
                    <div key={s.index} className={clsx('p-2.5 rounded-lg border text-[11px]', s.cited ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-100')}>
                      <div className="flex items-center gap-1.5 mb-1 text-gray-600">
                        <span className="font-bold text-indigo-600">[{s.index}]</span>
                        <FileText className="w-3 h-3 text-red-400" />
                        <span className="truncate">{s.documentName}</span>
                        <span className="text-gray-400 flex-shrink-0">· p.{s.pageNumber}</span>
                      </div>
                      <p className="text-gray-500 leading-relaxed line-clamp-4 whitespace-pre-line">{s.snippet}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Combine every claim into one note; per-claim [n] are renumbered into a shared list. */
function buildFactCheckNote(results, summary, documents) {
  const sources = [];
  const lines = [];
  for (const r of results) {
    const offset = sources.length;
    r.sources.forEach(s => sources.push({ ...s, index: s.index + offset }));
    const shift = (t) => t.replace(/\[(\d+)\]/g, (_m, n) => `[${+n + offset}]`);
    lines.push(`- **${VERDICTS[r.verdict]?.label ?? r.verdict}:** ${r.claim}`);
    if (r.explanation) lines.push(`  ${shift(r.explanation)}`);
    if (r.correction)  lines.push(`  *Documents say:* ${shift(r.correction)}`);
  }
  const head = summary.accuracy != null
    ? `**Accuracy ${summary.accuracy}%** · ${summary.supported} supported, ${summary.partiallySupported} partial, ${summary.contradicted} contradicted, ${summary.notFound} not found.`
    : `${summary.notFound} of ${summary.total} claims are not covered by the documents.`;
  return {
    kind:          'factcheck',
    title:         `Fact-check: ${results[0]?.claim.slice(0, 80) ?? 'claims'}${results.length > 1 ? ` (+${results.length - 1} more)` : ''}`,
    content:       `${head}\n\n${lines.join('\n')}`,
    sources,
    documentIds:   documents.map(d => d.id),
    documentNames: documents.map(d => d.name),
  };
}

export default function FactCheck() {
  const { onMenuClick } = useOutletContext();
  const [searchParams] = useSearchParams();
  const { documents } = useDocuments();

  const [picked, setPicked]   = useState(() => searchParams.get('docs')?.split(',').filter(Boolean) ?? null);
  const [text, setText]       = useState('');
  const [claims, setClaims]   = useState([]);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError]     = useState(null);
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Until the user picks, check against every processed document (max 10)
  const ready = documents.filter(d => d.status === 'completed');
  const scopeIds = picked ?? ready.slice(0, 10).map(d => d.id);
  const scopeDocs = scopeIds.map(id => documents.find(d => d.id === id)).filter(Boolean);

  const run = async () => {
    if (!text.trim() || !scopeIds.length || running) return;
    setClaims([]); setResults([]); setSummary(null); setError(null); setRunning(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      for await (const ev of verifyApi.stream(scopeIds, text.trim(), controller.signal)) {
        if (ev.type === 'claims')  setClaims(ev.data);
        if (ev.type === 'verdict') setResults(r => [...r, ev.data]);
        if (ev.type === 'done')    setSummary(ev.data.summary);
        if (ev.type === 'error')   throw new Error(ev.data?.message ?? 'Fact-check failed');
      }
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      abortRef.current = null;
      setRunning(false);
    }
  };

  const loadExample = () => {
    const doc = scopeDocs.find(d => d.brief?.keyPoints?.length);
    if (doc) {
      // Two true statements from the brief plus one deliberately wrong one
      const pts = doc.brief.keyPoints.slice(0, 2);
      const fig = doc.brief.keyFigures?.[0];
      const wrong = fig
        ? `${fig.label} was ${fig.value.replace(/\d+(\.\d+)?/, m => String(Math.round(parseFloat(m) * 1.7 + 3)))}.`
        : 'The document was published by NASA in 1998.';
      setText([...pts, wrong].join(' '));
    } else {
      setText('Paste a paragraph, email, essay or summary here and Insight will check every claim against your documents.');
    }
  };

  const counts = summary ?? {
    supported:          results.filter(r => r.verdict === 'supported').length,
    partiallySupported: results.filter(r => r.verdict === 'partially_supported').length,
    contradicted:       results.filter(r => r.verdict === 'contradicted').length,
    notFound:           results.filter(r => r.verdict === 'not_found').length,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Fact-check"
        subtitle="Verify any text, claim by claim, against your documents"
        onMenuClick={onMenuClick}
      />

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Input */}
          <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Check against</p>
              <ScopeBar documents={documents} scopeIds={scopeIds} onChange={setPicked} disabled={running} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500">Text to verify</p>
                <button onClick={loadExample} disabled={running} className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-40">
                  <Wand2 className="w-3 h-3" /> Try an example
                </button>
              </div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
                rows={6}
                placeholder="Paste a summary, an email, an essay draft, meeting notes, or an AI answer from another tool…"
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl resize-y focus:outline-none focus:border-indigo-400 leading-relaxed"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-gray-400">{text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}</span>
                {running ? (
                  <Button variant="secondary" size="md" icon={Square} onClick={() => abortRef.current?.abort()}>Stop</Button>
                ) : (
                  <Button size="md" icon={ShieldCheck} onClick={run} disabled={!text.trim() || !scopeIds.length}>
                    Check claims
                  </Button>
                )}
              </div>
            </div>
          </section>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}

          {running && claims.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Breaking the text into checkable claims…
            </div>
          )}

          {/* Summary */}
          {claims.length > 0 && (
            <section className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-shrink-0">
                  <p className="text-[11px] font-medium text-gray-500">Accuracy</p>
                  <p className="text-3xl font-bold tracking-tight text-gray-900">
                    {summary ? (summary.accuracy != null ? `${summary.accuracy}%` : '—') : <Loader2 className="w-6 h-6 animate-spin text-gray-300 mt-1" />}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
                    {[
                      ['supported', counts.supported],
                      ['partially_supported', counts.partiallySupported],
                      ['contradicted', counts.contradicted],
                      ['not_found', counts.notFound],
                    ].map(([k, c]) => c > 0 && (
                      <div key={k} className={clsx(VERDICTS[k].bar, 'transition-all duration-500')} style={{ width: `${(c / claims.length) * 100}%` }} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
                    {[
                      ['supported', counts.supported],
                      ['partially_supported', counts.partiallySupported],
                      ['contradicted', counts.contradicted],
                      ['not_found', counts.notFound],
                    ].map(([k, c]) => (
                      <span key={k} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                        <span className={clsx('w-2 h-2 rounded-full', VERDICTS[k].bar)} />
                        {c} {VERDICTS[k].label.toLowerCase()}
                      </span>
                    ))}
                    <span className="text-xs text-gray-400">{results.length}/{claims.length} checked</span>
                  </div>
                </div>
                {summary && results.length > 0 && (
                  <SaveNoteButton
                    label="Save report"
                    className="self-start sm:self-center"
                    buildNote={() => buildFactCheckNote(results, summary, scopeDocs)}
                  />
                )}
              </div>
            </section>
          )}

          {/* Claims */}
          <div className="space-y-3">
            {claims.map((c, i) => (
              <ClaimCard
                key={i}
                n={i + 1}
                claim={c}
                result={results[i]}
                pending={!results[i] && running}
              />
            )).filter((_, i) => results[i] || running)}
          </div>

          {!running && claims.length === 0 && !error && (
            <div className="text-center py-10">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
              </div>
              <p className="text-sm font-medium text-gray-800">Catch mistakes before they spread</p>
              <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
                Insight splits the text into individual claims and checks each one against the exact passages
                in your documents — flagging contradictions and showing what the source really says.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
