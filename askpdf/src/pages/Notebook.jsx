import { useState, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  NotebookPen, Download, Trash2, Search, MessageSquare, ShieldCheck, PenLine,
  ChevronDown, ChevronRight, FileText, Check, X, ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';
import Header from '../components/layout/Header';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { AnswerBody } from '../components/chat/ChatMessage';
import { notesApi } from '../services/api';
import { useResource } from '../hooks/useResource';
import { formatDate } from '../utils/helpers';

const KINDS = {
  answer:    { label: 'Answer',     icon: MessageSquare, cls: 'bg-indigo-50 text-indigo-700' },
  factcheck: { label: 'Fact-check', icon: ShieldCheck,   cls: 'bg-emerald-50 text-emerald-700' },
  manual:    { label: 'Note',       icon: PenLine,       cls: 'bg-gray-100 text-gray-700' },
};

function NoteCard({ note, onDelete, onRename }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [title, setTitle]     = useState(note.title);
  const [showSrc, setShowSrc] = useState(false);
  const kind = KINDS[note.kind] ?? KINDS.manual;
  const Icon = kind.icon;
  const cited = note.sources.filter(s => s.cited);
  const shown = cited.length ? cited : note.sources;

  const save = async () => {
    const t = title.trim();
    if (t && t !== note.title) await onRename(note.id, t);
    else setTitle(note.title);
    setEditing(false);
  };

  return (
    <article className="bg-white border border-gray-200 rounded-xl p-5 group animate-fade-in">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', kind.cls)}>
              <Icon className="w-3 h-3" /> {kind.label}
            </span>
            <span className="text-[11px] text-gray-400">{formatDate(note.createdAt)}</span>
          </div>
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setTitle(note.title); setEditing(false); } }}
                className="flex-1 h-8 px-2 text-sm font-semibold border border-indigo-300 rounded-md focus:outline-none"
              />
              <button onClick={save} className="p-1.5 rounded-md hover:bg-gray-100 text-emerald-600" aria-label="Save title"><Check className="w-4 h-4" /></button>
              <button onClick={() => { setTitle(note.title); setEditing(false); }} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400" aria-label="Cancel"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <h3
              className="text-sm font-semibold text-gray-900 leading-snug cursor-text hover:text-indigo-700"
              onClick={() => setEditing(true)}
              title="Click to rename"
            >
              {note.title}
            </h3>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {note.conversationId && (
            <button
              onClick={() => navigate(`/chat?docs=${note.documentIds.join(',')}&convId=${note.conversationId}`)}
              className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              title="Open the conversation"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => notesApi.export([note.id]).catch(err => alert(err.message))}
            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title="Export this note"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="p-1.5 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600"
            title="Delete note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="text-gray-700">
        <AnswerBody content={note.content} sources={note.sources} />
      </div>

      <div className="flex items-center gap-3 flex-wrap mt-3 pt-3 border-t border-gray-100">
        {note.documentNames.slice(0, 3).map(n => (
          <span key={n} className="inline-flex items-center gap-1 text-[11px] text-gray-500 max-w-[200px]">
            <FileText className="w-3 h-3 text-red-400 flex-shrink-0" /><span className="truncate">{n}</span>
          </span>
        ))}
        {note.documentNames.length > 3 && <span className="text-[11px] text-gray-400">+{note.documentNames.length - 3}</span>}
        {shown.length > 0 && (
          <button onClick={() => setShowSrc(s => !s)} className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-indigo-600">
            {showSrc ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {shown.length} reference{shown.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {showSrc && (
        <ol className="mt-2 space-y-1.5">
          {shown.map(s => (
            <li key={s.index} className="text-[11px] text-gray-500 flex gap-2">
              <span className="font-bold text-indigo-600 flex-shrink-0">[{s.index}]</span>
              <span>
                <span className="font-medium text-gray-700">{s.documentName}</span>, p.{s.pageNumber} — “{s.snippet?.slice(0, 180)}…”
              </span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

export default function Notebook() {
  const { onMenuClick } = useOutletContext();
  const navigate = useNavigate();
  const { data, loading, error: loadError, refetch, mutate } = useResource('notes', notesApi.list, { staleMs: 0 });
  const notes = data ?? [];
  const [actionError, setError] = useState(null);
  const error = actionError ?? loadError;
  const [query, setQuery]     = useState('');
  const [kind, setKind]       = useState('all');

  const remove = useCallback(async (id) => {
    mutate(n => (n ?? []).filter(x => x.id !== id));
    try { await notesApi.delete(id); }
    catch (err) { setError(err.message); refetch(); }
  }, [mutate, refetch]);

  const rename = useCallback(async (id, title) => {
    try {
      const updated = await notesApi.update(id, { title });
      mutate(n => (n ?? []).map(x => (x.id === id ? updated : x)));
    } catch (err) { setError(err.message); }
  }, [mutate]);

  const q = query.toLowerCase();
  const filtered = notes.filter(n =>
    (kind === 'all' || n.kind === kind) &&
    (!q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) ||
      n.documentNames.some(d => d.toLowerCase().includes(q)))
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Notebook"
        subtitle={loading ? 'Loading…' : `${notes.length} saved finding${notes.length !== 1 ? 's' : ''}`}
        onMenuClick={onMenuClick}
        actions={notes.length > 0 && (
          <button
            onClick={() => notesApi.export(filtered.length !== notes.length ? filtered.map(n => n.id) : undefined).catch(err => setError(err.message))}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export {filtered.length !== notes.length ? `${filtered.length} ` : ''}as report</span>
          </button>
        )}
      />

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

          {notes.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search your findings…"
                  className="w-full h-9 pl-9 pr-4 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400"
                />
              </div>
              <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                {[['all', 'All'], ['answer', 'Answers'], ['factcheck', 'Fact-checks']].map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={clsx('px-3 h-8 rounded-md text-xs font-medium transition-colors',
                      kind === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && notes.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title="Your notebook is empty"
              description="Save answers and fact-checks with the bookmark button. They keep their citations, and you can export everything as a referenced report."
              action={<Button icon={MessageSquare} onClick={() => navigate('/chat')}>Start researching</Button>}
            />
          ) : (
            filtered.map(n => <NoteCard key={n.id} note={n} onDelete={remove} onRename={rename} />)
          )}

          {!loading && notes.length > 0 && filtered.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">No findings match your search.</p>
          )}
        </div>
      </main>
    </div>
  );
}
