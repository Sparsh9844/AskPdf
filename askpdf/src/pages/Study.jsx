import { useState } from 'react';
import { useOutletContext, useSearchParams, useNavigate } from 'react-router-dom';
import {
  GraduationCap, Loader2, CheckCircle2, XCircle, ArrowRight, RotateCcw, MessageSquare,
  Trophy, Target, BookOpen, Sparkles,
} from 'lucide-react';
import clsx from 'clsx';
import Header from '../components/layout/Header';
import Button from '../components/ui/Button';
import { useDocuments } from '../hooks/useDocuments';
import { documentsApi } from '../services/api';
import { formatDate } from '../utils/helpers';

const HISTORY_KEY = (docId) => `insight.quiz.${docId}`;

// Score history is a per-browser convenience — never required for the page to work
function readHistory(docId) {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY(docId)) ?? '[]'); }
  catch { return []; }
}
function pushHistory(docId, entry) {
  try {
    const list = [entry, ...readHistory(docId)].slice(0, 10);
    localStorage.setItem(HISTORY_KEY(docId), JSON.stringify(list));
  } catch { /* storage unavailable */ }
}

function Segmented({ value, options, onChange }) {
  return (
    <div className="inline-flex p-0.5 bg-gray-100 rounded-lg">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={clsx(
            'px-3 h-7 rounded-md text-xs font-medium transition-colors',
            value === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function Study() {
  const { onMenuClick } = useOutletContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { documents } = useDocuments();

  const ready = documents.filter(d => d.status === 'completed');
  const [pickedId, setPickedId]     = useState(searchParams.get('doc'));
  const docId = pickedId ?? ready[0]?.id ?? null;
  const doc   = documents.find(d => d.id === docId);

  const [count, setCount]           = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [focus, setFocus]           = useState(searchParams.get('focus') ?? '');

  const [quiz, setQuiz]         = useState(null);    // { questions, focus, difficulty }
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [current, setCurrent]   = useState(0);
  const [answers, setAnswers]   = useState([]);      // chosen option index per question
  const [history, setHistory]   = useState([]);

  const start = async () => {
    if (!docId) return;
    setLoading(true); setError(null);
    try {
      const res = await documentsApi.quiz(docId, { count, difficulty, focus: focus.trim() });
      setQuiz({ questions: res.questions, focus: focus.trim(), difficulty });
      setCurrent(0);
      setAnswers([]);
      setHistory(readHistory(docId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setQuiz(null); setAnswers([]); setCurrent(0); };

  const ask = (q) => navigate(`/chat?docs=${docId}&q=${encodeURIComponent(q)}`);

  // ── Setup screen ──────────────────────────────────────────────────────────
  if (!quiz) {
    const topics = doc?.brief?.topics ?? [];
    const past   = docId ? readHistory(docId) : [];
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="Study" subtitle="Turn any document into a cited quiz" onMenuClick={onMenuClick} />
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="max-w-2xl mx-auto space-y-5">
            <section className="bg-gradient-to-br from-indigo-50 via-white to-white border border-indigo-100 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Quiz yourself</h2>
                  <p className="text-xs text-gray-500">Every question comes from the document, with the page to revisit.</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Document</span>
                  <select
                    value={docId ?? ''}
                    onChange={e => setPickedId(e.target.value)}
                    className="mt-1 w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-400"
                  >
                    {ready.length === 0 && <option value="">No processed documents</option>}
                    {ready.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </label>

                <div className="flex flex-wrap gap-5">
                  <div>
                    <span className="block text-xs font-medium text-gray-600 mb-1">Questions</span>
                    <Segmented value={count} onChange={setCount} options={[[3, '3'], [5, '5'], [10, '10']]} />
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-600 mb-1">Difficulty</span>
                    <Segmented value={difficulty} onChange={setDifficulty} options={[['easy', 'Recall'], ['medium', 'Understand'], ['hard', 'Analyse']]} />
                  </div>
                </div>

                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Focus <span className="font-normal text-gray-400">(optional)</span></span>
                  <input
                    value={focus}
                    onChange={e => setFocus(e.target.value)}
                    placeholder="e.g. methodology, chapter 3, key risks — or leave blank for the whole document"
                    className="mt-1 w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-400"
                  />
                </label>
                {topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 -mt-1">
                    {topics.map(t => (
                      <button
                        key={t}
                        onClick={() => setFocus(t)}
                        className={clsx(
                          'px-2 py-0.5 rounded-full text-[11px] border transition-colors',
                          focus === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}

                {error && <p className="text-xs text-red-600">{error}</p>}

                <Button icon={loading ? undefined : Sparkles} loading={loading} onClick={start} disabled={!docId} className="w-full">
                  {loading ? 'Writing your questions…' : 'Start quiz'}
                </Button>
              </div>
            </section>

            {past.length > 0 && (
              <section className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                  <Target className="w-4 h-4 text-indigo-500" /> Your progress on this document
                </h3>
                <div className="flex items-end gap-1.5 h-16">
                  {[...past].reverse().map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${h.score}/${h.total} · ${formatDate(h.date)}`}>
                      <div
                        className={clsx('w-full rounded-t-md', h.score / h.total >= 0.8 ? 'bg-emerald-400' : h.score / h.total >= 0.5 ? 'bg-amber-400' : 'bg-red-300')}
                        style={{ height: `${Math.max(8, (h.score / h.total) * 100)}%` }}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">
                  Last {past.length} quizzes · best {Math.max(...past.map(h => Math.round((h.score / h.total) * 100)))}%
                </p>
              </section>
            )}
          </div>
        </main>
      </div>
    );
  }

  const { questions } = quiz;
  const finished = answers.length === questions.length && current >= questions.length;

  // ── Results screen ────────────────────────────────────────────────────────
  if (finished) {
    const score  = answers.filter((a, i) => a === questions[i].answerIndex).length;
    const pct    = Math.round((score / questions.length) * 100);
    const missed = questions.filter((q, i) => answers[i] !== q.answerIndex);
    const best   = history.length ? Math.max(...history.map(h => Math.round((h.score / h.total) * 100))) : null;

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="Study" subtitle={doc?.name} onMenuClick={onMenuClick} />
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="max-w-2xl mx-auto space-y-5">
            <section className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <div className={clsx(
                'w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center',
                pct >= 80 ? 'bg-emerald-100' : pct >= 50 ? 'bg-amber-100' : 'bg-red-100'
              )}>
                <Trophy className={clsx('w-7 h-7', pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500')} />
              </div>
              <p className="text-4xl font-bold tracking-tight text-gray-900">{score}/{questions.length}</p>
              <p className="text-sm text-gray-500 mt-1">
                {pct >= 80 ? 'Excellent — you know this material.' : pct >= 50 ? 'Good progress — review the misses below.' : 'Worth another read of the pages below.'}
              </p>
              {best != null && (
                <p className="text-xs text-gray-400 mt-2">
                  {pct > best ? `New personal best (previous ${best}%)` : `Personal best: ${best}%`}
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-2 mt-5">
                <Button icon={RotateCcw} onClick={start} loading={loading}>New questions</Button>
                <Button variant="secondary" onClick={reset}>Change settings</Button>
              </div>
            </section>

            {missed.length > 0 && (
              <section className="bg-white border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <BookOpen className="w-4 h-4 text-indigo-500" /> Review what you missed
                  </h3>
                  <Button
                    variant="ghost" size="sm" icon={MessageSquare}
                    onClick={() => ask(`Explain these concepts clearly so I understand them: ${missed.map(q => q.question).join(' | ')}`)}
                  >
                    Explain all
                  </Button>
                </div>
                <div className="divide-y divide-gray-100">
                  {missed.map((q, i) => (
                    <div key={i} className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{q.question}</p>
                      <p className="text-sm text-emerald-700 mt-1.5 flex items-start gap-1.5">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> {q.options[q.answerIndex]}
                      </p>
                      <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{q.explanation}</p>
                      <div className="flex items-center gap-3 mt-2">
                        {q.page && <span className="text-[11px] text-gray-400">Page {q.page}</span>}
                        <button onClick={() => ask(q.question)} className="text-[11px] font-medium text-indigo-600 hover:underline">
                          Ask Insight about this
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── Question screen ───────────────────────────────────────────────────────
  const q        = questions[current];
  const chosen   = answers[current];
  const answered = chosen !== undefined;
  const correct  = answered && chosen === q.answerIndex;

  const choose = (i) => {
    if (answered) return;
    const next = [...answers];
    next[current] = i;
    setAnswers(next);
  };

  const advance = () => {
    if (current + 1 >= questions.length) {
      const score = answers.filter((a, i) => a === questions[i].answerIndex).length;
      pushHistory(docId, { score, total: questions.length, date: new Date().toISOString(), focus: quiz.focus });
    }
    setCurrent(c => c + 1);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Study"
        subtitle={`${doc?.name ?? ''}${quiz.focus ? ` · ${quiz.focus}` : ''}`}
        onMenuClick={onMenuClick}
        actions={<Button variant="ghost" size="sm" onClick={reset}>Quit</Button>}
      />
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 flex gap-1">
              {questions.map((qq, i) => (
                <div
                  key={i}
                  className={clsx(
                    'h-1.5 flex-1 rounded-full transition-colors',
                    answers[i] === undefined
                      ? i === current ? 'bg-indigo-300' : 'bg-gray-200'
                      : answers[i] === qq.answerIndex ? 'bg-emerald-500' : 'bg-red-400'
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500 tabular-nums">{current + 1}/{questions.length}</span>
          </div>

          <section key={current} className="bg-white border border-gray-200 rounded-xl p-6 animate-slide-up">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500 mb-2">Question {current + 1}</p>
            <h2 className="text-base font-semibold text-gray-900 leading-snug mb-5">{q.question}</h2>

            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const isAnswer = i === q.answerIndex;
                const isChosen = i === chosen;
                return (
                  <button
                    key={i}
                    onClick={() => choose(i)}
                    disabled={answered}
                    className={clsx(
                      'w-full flex items-start gap-3 text-left px-4 py-3 rounded-xl border text-sm transition-all',
                      !answered && 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40',
                      answered && isAnswer && 'border-emerald-300 bg-emerald-50 text-emerald-900',
                      answered && isChosen && !isAnswer && 'border-red-300 bg-red-50 text-red-900',
                      answered && !isAnswer && !isChosen && 'border-gray-100 text-gray-400'
                    )}
                  >
                    <span className={clsx(
                      'w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold flex-shrink-0',
                      answered && isAnswer ? 'bg-emerald-500 text-white'
                        : answered && isChosen ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    )}>
                      {answered && isAnswer ? <CheckCircle2 className="w-3.5 h-3.5" />
                        : answered && isChosen ? <XCircle className="w-3.5 h-3.5" />
                        : String.fromCharCode(65 + i)}
                    </span>
                    <span className="pt-0.5">{opt}</span>
                  </button>
                );
              })}
            </div>

            {answered && (
              <div className={clsx(
                'mt-5 rounded-xl px-4 py-3 animate-fade-in',
                correct ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'
              )}>
                <p className={clsx('text-sm font-semibold', correct ? 'text-emerald-800' : 'text-amber-800')}>
                  {correct ? 'Correct!' : 'Not quite.'}
                </p>
                <p className="text-sm text-gray-700 mt-1 leading-relaxed">{q.explanation}</p>
                <div className="flex items-center gap-3 mt-2">
                  {q.page && <span className="text-[11px] text-gray-500">Source: page {q.page}</span>}
                  <button onClick={() => ask(q.question)} className="text-[11px] font-medium text-indigo-600 hover:underline">
                    Dig deeper in chat
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-5">
              <Button iconRight={ArrowRight} onClick={advance} disabled={!answered}>
                {current + 1 >= questions.length ? 'See results' : 'Next question'}
              </Button>
            </div>
          </section>

          {loading && (
            <p className="flex items-center justify-center gap-2 text-xs text-gray-400 mt-4">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading…
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
