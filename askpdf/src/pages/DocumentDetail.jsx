import { useOutletContext, useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, MessageSquare, RefreshCw, Sparkles, FileText, BookOpen, Clock, Hash,
  Lightbulb, Tag, Users, Building2, MapPin, Package, Scale, Circle, BarChart3,
  CornerDownRight, AlertCircle, Loader2, GraduationCap, ShieldCheck,
} from 'lucide-react';
import Header from '../components/layout/Header';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import { useDocument } from '../hooks/useDocument';
import { formatBytes, formatDate } from '../utils/helpers';

const ENTITY_META = {
  person:       { label: 'People',        icon: Users },
  organization: { label: 'Organizations', icon: Building2 },
  place:        { label: 'Places',        icon: MapPin },
  product:      { label: 'Products',      icon: Package },
  law:          { label: 'Laws & rules',  icon: Scale },
  other:        { label: 'Other',         icon: Circle },
};

function Section({ icon: Icon, title, children, className = '' }) {
  return (
    <section className={`bg-white border border-gray-200 rounded-xl ${className}`}>
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
        <Icon className="w-4 h-4 text-indigo-500" strokeWidth={1.75} />
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Meta({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-gray-400" />
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-semibold text-gray-800">{value}</span>
    </div>
  );
}

export default function DocumentDetail() {
  const { onMenuClick } = useOutletContext();
  const { id } = useParams();
  const navigate = useNavigate();
  const { doc, loading, error, generating, generateBrief } = useDocument(id);

  const ask = (q) => navigate(`/chat?docs=${id}${q ? `&q=${encodeURIComponent(q)}` : ''}`);

  if (loading && !doc) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Document" subtitle="Loading…" onMenuClick={onMenuClick} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Document" onMenuClick={onMenuClick} />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-gray-600">{error ?? 'Document not found.'}</p>
          <Link to="/documents" className="text-sm font-medium text-indigo-600 hover:underline">Back to documents</Link>
        </div>
      </div>
    );
  }

  const brief    = doc.brief;
  const ready    = doc.status === 'completed';
  const readMins = doc.wordCount ? Math.max(1, Math.round(doc.wordCount / 230)) : null;

  const entityGroups = (brief?.entities ?? []).reduce((acc, e) => {
    const key = ENTITY_META[e.type] ? e.type : 'other';
    (acc[key] ??= []).push(e.name);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title={doc.name}
        subtitle={brief?.documentType || 'Document intelligence'}
        onMenuClick={onMenuClick}
        actions={
          <>
            <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/documents')}>
              <span className="hidden sm:inline">Back</span>
            </Button>
            {ready && (
              <>
                <Button variant="secondary" size="sm" icon={ShieldCheck} onClick={() => navigate(`/verify?docs=${id}`)}>
                  <span className="hidden md:inline">Fact-check</span>
                </Button>
                <Button variant="secondary" size="sm" icon={GraduationCap} onClick={() => navigate(`/study?doc=${id}`)}>
                  <span className="hidden md:inline">Quiz me</span>
                </Button>
                <Button size="sm" icon={MessageSquare} onClick={() => ask()}>
                  <span className="hidden sm:inline">Ask questions</span>
                </Button>
              </>
            )}
          </>
        }
      />

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-5xl mx-auto space-y-5">
          {/* Identity strip */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-red-500" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h2 className="text-base font-semibold text-gray-900 truncate">{doc.name}</h2>
                <StatusBadge status={doc.status} />
                {brief?.documentType && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {brief.documentType}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                <Meta icon={BookOpen} label="Pages"  value={doc.pages || '—'} />
                {doc.wordCount > 0 && <Meta icon={Hash} label="Words" value={doc.wordCount.toLocaleString()} />}
                {readMins && <Meta icon={Clock} label="Read time" value={`${readMins} min`} />}
                <Meta icon={BarChart3} label="Passages" value={doc.chunks || '—'} />
                <Meta icon={FileText} label="Size" value={formatBytes(doc.size)} />
                <span className="text-xs text-gray-400">Uploaded {formatDate(doc.uploadedAt)}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {!ready ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
              <p className="text-sm text-gray-600">
                {doc.status === 'error'
                  ? `Processing failed: ${doc.errorMessage ?? 'unknown error'}`
                  : 'This document is still being processed. The brief will appear when it’s ready.'}
              </p>
            </div>
          ) : !brief ? (
            /* Documents indexed before briefs existed, or a failed brief */
            <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Generate an intelligence brief</h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto mb-5">
                Get a summary, key takeaways, important figures, the people and organisations mentioned,
                and questions worth asking — in a few seconds.
              </p>
              {doc.briefError && (
                <p className="text-xs text-red-600 mb-4">Last attempt failed: {doc.briefError}</p>
              )}
              <Button icon={Sparkles} loading={generating} onClick={generateBrief}>
                {generating ? 'Analysing…' : 'Generate brief'}
              </Button>
            </div>
          ) : (
            <>
              {/* Summary */}
              <section className="bg-gradient-to-br from-indigo-50 via-white to-white border border-indigo-100 rounded-xl p-6">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h2 className="text-sm font-semibold text-gray-900">Summary</h2>
                  </div>
                  <button
                    onClick={generateBrief}
                    disabled={generating}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-indigo-600 disabled:opacity-50"
                    title="Regenerate brief"
                  >
                    <RefreshCw className={`w-3 h-3 ${generating ? 'animate-spin' : ''}`} />
                    {generating ? 'Regenerating…' : 'Regenerate'}
                  </button>
                </div>
                <p className="text-[15px] leading-relaxed text-gray-800">{brief.summary}</p>
                {brief.topics?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {brief.topics.map(t => (
                      <button
                        key={t}
                        onClick={() => ask(`What does the document say about ${t}?`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-white border border-gray-200 text-gray-700 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                        title={`Ask about ${t}`}
                      >
                        <Tag className="w-3 h-3 text-gray-400" /> {t}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Key points */}
                <Section icon={Lightbulb} title="Key takeaways" className="lg:col-span-3">
                  <ol className="space-y-3">
                    {brief.keyPoints.map((p, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="w-5 h-5 rounded-md bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-700 leading-relaxed">{p}</span>
                      </li>
                    ))}
                  </ol>
                </Section>

                {/* Questions */}
                <Section icon={MessageSquare} title="Questions worth asking" className="lg:col-span-2">
                  <div className="space-y-2">
                    {brief.suggestedQuestions.map(q => (
                      <button
                        key={q}
                        onClick={() => ask(q)}
                        className="group w-full text-left flex items-start gap-2 px-3 py-2.5 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
                      >
                        <CornerDownRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{q}</span>
                      </button>
                    ))}
                  </div>
                </Section>
              </div>

              {/* Figures */}
              {brief.keyFigures?.length > 0 && (
                <Section icon={BarChart3} title="Key figures">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {brief.keyFigures.map((f, i) => (
                      <button
                        key={i}
                        onClick={() => ask(`Explain this figure and its context: ${f.label} (${f.value})`)}
                        className="text-left p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all"
                      >
                        <p className="text-xl font-bold text-gray-900 tracking-tight break-words">{f.value}</p>
                        <p className="text-xs text-gray-600 mt-1 leading-snug">{f.label}</p>
                        {f.page && <p className="text-[10px] text-gray-400 mt-2">Page {f.page}</p>}
                      </button>
                    ))}
                  </div>
                </Section>
              )}

              {/* Entities */}
              {Object.keys(entityGroups).length > 0 && (
                <Section icon={Users} title="Who and what is mentioned">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {Object.entries(entityGroups).map(([type, names]) => {
                      const { label, icon: Icon } = ENTITY_META[type];
                      return (
                        <div key={type}>
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                            <Icon className="w-3 h-3" /> {label}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {names.map(n => (
                              <button
                                key={n}
                                onClick={() => ask(`What role does ${n} play in the document?`)}
                                className="px-2.5 py-1 rounded-lg text-xs bg-gray-100 text-gray-700 hover:bg-indigo-100 hover:text-indigo-800 transition-colors"
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              <p className="text-[11px] text-gray-400 text-center">
                Brief generated {formatDate(brief.generatedAt)} from a sample of the document. Ask questions for fully cited answers.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
