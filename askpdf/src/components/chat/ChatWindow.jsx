import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Plus, Sparkles, PanelRightOpen, PanelRightClose, AlertCircle, CornerDownRight, Layers, Download,
} from 'lucide-react';
import clsx from 'clsx';
import ChatMessage, { AnswerBody } from './ChatMessage';
import ChatInput from './ChatInput';
import SourcePanel from './SourcePanel';
import ResearchTrace from './ResearchTrace';
import ScopeBar from './ScopeBar';
import EmptyState from '../ui/EmptyState';
import { useChat } from '../../hooks/useChat';
import { conversationsApi } from '../../services/api';

const GENERIC_QUESTIONS = [
  'Summarise this document in five bullet points',
  'What are the most important facts and figures?',
  'What conclusions or recommendations does it make?',
  'Are there any risks, limitations or open questions?',
];

/** Interleave brief questions from each document so every doc is represented. */
function suggestionsFor(docs) {
  const lists = docs.map(d => d.brief?.suggestedQuestions ?? []);
  const out = [];
  if (docs.length > 1) out.push(`Compare the key points of these ${docs.length} documents`);
  for (let i = 0; out.length < 4 && lists.some(l => l[i]); i++) {
    for (const l of lists) if (l[i] && out.length < 4) out.push(l[i]);
  }
  return out.length ? out : GENERIC_QUESTIONS;
}

/**
 * ChatWindow — research chat over one or more documents.
 *
 * Props:
 *   documents        — all documents (for names, briefs, scope picker)
 *   scopeIds         — ids of documents in scope
 *   onScopeChange    — (ids) => void
 *   conversationId   — existing conversation to resume (null = new)
 *   onNewChat        — clear the conversation
 *   onConvCreated    — (newConvId) => void after the first message creates one
 *   onTurnComplete   — called after every answer (e.g. refresh history titles)
 *   initialQuestion  — auto-ask this once (from ?q=)
 *   onInitialQuestionConsumed
 */
export default function ChatWindow({
  documents, scopeIds, onScopeChange, conversationId,
  onNewChat, onConvCreated, onTurnComplete, initialQuestion, onInitialQuestionConsumed,
}) {
  const [mode, setMode]           = useState('quick');
  const [panel, setPanel]         = useState(null);   // { messageId, index } | null
  const scrollRef                 = useRef();
  const askedInitial              = useRef(false);

  const {
    messages, pending, isTyping, activeConvId, error, sendMessage, stop, resetChat,
  } = useChat(scopeIds, conversationId, { onTurnComplete });

  const scopeDocs = useMemo(
    () => scopeIds.map(id => documents.find(d => d.id === id)).filter(Boolean),
    [scopeIds, documents]
  );

  // Each new question opens the evidence panel for its answer (shown once
  // sources arrive); closing it mid-answer keeps it closed.
  const send = useCallback((q) => {
    setPanel({ messageId: 'pending', index: null });
    sendMessage(q, mode);
  }, [sendMessage, mode]);

  // Notify parent whenever a new conversation gets created
  const prevConvId = useRef(null);
  useEffect(() => {
    if (activeConvId && activeConvId !== prevConvId.current) {
      prevConvId.current = activeConvId;
      if (!conversationId && onConvCreated) onConvCreated(activeConvId);
    }
  }, [activeConvId, conversationId, onConvCreated]);

  // Auto-ask a question passed in from elsewhere (document brief, dashboard)
  useEffect(() => {
    if (!initialQuestion || askedInitial.current || conversationId || scopeDocs.length === 0) return;
    askedInitial.current = true;
    send(initialQuestion);
    onInitialQuestionConsumed?.();
  }, [initialQuestion, conversationId, scopeDocs.length, send, onInitialQuestionConsumed]);

  // Auto-scroll on new content
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, pending]);

  // The panel can point at the live answer ('pending'); once that answer is
  // saved, the same panel resolves to the persisted last message.
  const lastMsg = messages[messages.length - 1];
  const panelMessageId = panel?.messageId === 'pending' && !pending
    ? (lastMsg?.role === 'assistant' ? lastMsg.id : null)
    : panel?.messageId;
  const activePanel = panel && panelMessageId ? { messageId: panelMessageId, index: panel.index } : null;

  const openSources = useCallback((message, src) =>
    setPanel({ messageId: message.id, index: src?.index ?? null }), []);

  const saveContext = useMemo(() => ({
    documentIds:    scopeIds,
    documentNames:  scopeDocs.map(d => d.name),
    conversationId: activeConvId,
  }), [scopeIds, scopeDocs, activeConvId]);

  const panelSources = panelMessageId === 'pending'
    ? pending?.sources
    : messages.find(m => m.id === panelMessageId)?.sources;

  const latestWithSources = [...messages].reverse().find(m => m.sources?.length);

  const handleScopeChange = async (ids) => {
    if (activeConvId) {
      try { await conversationsApi.updateScope(activeConvId, ids); }
      catch (err) { console.error(err); return; }
    }
    onScopeChange(ids);
  };

  const handleNewChat = () => {
    resetChat();
    setPanel(null);
    onNewChat?.();
  };

  // No document selected
  if (scopeIds.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <EmptyState
          icon={FileText}
          title="No document selected"
          description="Choose one or more documents, then start asking questions."
          action={
            <Link
              to="/documents"
              className="inline-flex items-center gap-2 h-9 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Browse Documents
            </Link>
          }
        />
      </div>
    );
  }

  const followUps = !isTyping && lastMsg?.role === 'assistant' ? lastMsg.followUps ?? [] : [];
  const single    = scopeDocs.length === 1 ? scopeDocs[0] : null;

  return (
    <div className="flex flex-1 min-w-0 h-full overflow-hidden">
      {/* Main chat column */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Scope + actions */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 border-b border-gray-200 bg-white flex-shrink-0">
          <ScopeBar
            documents={documents}
            scopeIds={scopeIds}
            onChange={handleScopeChange}
            disabled={isTyping}
          />
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => activePanel
                ? setPanel(null)
                : latestWithSources && setPanel({ messageId: latestWithSources.id, index: null })}
              disabled={!activePanel && !latestWithSources}
              className={clsx(
                'flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40',
                activePanel
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              )}
            >
              {activePanel ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Evidence</span>
            </button>
            {activeConvId && messages.some(m => m.role === 'assistant' && !m.isError) && !isTyping && (
              <button
                onClick={() => conversationsApi.export(activeConvId).catch(err => alert(err.message))}
                title="Download this conversation as a cited Markdown report"
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Export</span>
              </button>
            )}
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">New Chat</span>
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 animate-fade-in">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
          {messages.length === 0 && !isTyping ? (
            <div className="flex flex-col items-center justify-center min-h-full gap-6 animate-fade-in max-w-xl mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-200">
                {single ? <Sparkles className="w-6 h-6 text-white" /> : <Layers className="w-6 h-6 text-white" />}
              </div>

              <div className="text-center">
                <h3 className="text-base font-semibold text-gray-800 mb-1">
                  {single ? 'What do you want to know?' : `Research across ${scopeDocs.length} documents`}
                </h3>
                {single?.brief?.summary ? (
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {single.brief.documentType && (
                      <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-medium align-middle">
                        {single.brief.documentType}
                      </span>
                    )}
                    {single.brief.summary.split(/(?<=\.)\s/).slice(0, 2).join(' ')}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    Every answer is researched step by step and cited back to the exact page.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 w-full">
                {suggestionsFor(scopeDocs).map(q => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="group text-left px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm text-sm text-gray-700 transition-all duration-150 flex items-center gap-2"
                  >
                    <CornerDownRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-500 flex-shrink-0" />
                    {q}
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-gray-400 text-center">
                Tip: switch to <span className="font-medium text-indigo-600">Deep research</span> for comparisons and multi-part questions.
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onOpenSources={openSources}
                  isActive={activePanel?.messageId === msg.id}
                  activeIndex={activePanel?.messageId === msg.id ? activePanel.index : null}
                  question={messages[i - 1]?.role === 'user' ? messages[i - 1].content : ''}
                  saveContext={saveContext}
                />
              ))}

              {/* Live research turn */}
              {pending && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex flex-col gap-2 max-w-[85%] min-w-0">
                    {!pending.content
                      ? <ResearchTrace trace={pending.trace} mode={pending.mode} live />
                      : <ResearchTrace trace={pending.trace} mode={pending.mode} />}
                    {pending.content && (
                      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-gray-200 shadow-sm text-sm">
                        <AnswerBody
                          content={pending.content}
                          sources={pending.sources}
                          streaming
                          activeIndex={panel?.messageId === 'pending' ? panel.index : null}
                          onCitationClick={(src) => setPanel({ messageId: 'pending', index: src.index })}
                        />
                      </div>
                    )}
                    {pending.trace.length === 0 && (
                      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-gray-200 shadow-sm flex gap-1 w-fit">
                        {[0, 1, 2].map(i => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Follow-up suggestions from the last answer */}
        {followUps.length > 0 && (
          <div className="px-4 sm:px-6 pb-2 flex gap-2 overflow-x-auto flex-shrink-0">
            {followUps.map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-indigo-100 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-800 transition-colors"
              >
                <CornerDownRight className="w-3 h-3" />
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 sm:px-6 pb-4 pt-2 flex-shrink-0">
          <ChatInput
            onSend={send}
            onStop={stop}
            busy={isTyping}
            mode={mode}
            onModeChange={setMode}
            placeholder={single ? 'Ask anything about this document…' : 'Ask across the selected documents…'}
          />
          <p className="text-[11px] text-gray-400 text-center mt-2">
            Answers cite their sources — click a number to check the original passage.
          </p>
        </div>
      </div>

      {/* Evidence panel */}
      {activePanel && panelSources?.length > 0 && (
        <div className="hidden md:flex">
          <SourcePanel
            sources={panelSources}
            activeIndex={activePanel.index}
            onSelect={(src) => setPanel(p => ({ ...p, index: src.index }))}
            onClose={() => setPanel(null)}
          />
        </div>
      )}
    </div>
  );
}
