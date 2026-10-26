import { useState, useCallback, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Plus, FileText, Search, Trash2, Layers } from 'lucide-react';
import Header from '../components/layout/Header';
import ChatWindow from '../components/chat/ChatWindow';
import { useDocuments } from '../hooks/useDocuments';
import { useConversations } from '../hooks/useConversations';
import { formatDate } from '../utils/helpers';
import clsx from 'clsx';

/**
 * URL state:
 *   ?docs=id1,id2   documents in scope (legacy ?docId=id also accepted)
 *   &convId=…       conversation being viewed
 *   &q=…            question to ask automatically (from a document brief)
 */
export default function Chat() {
  const { onMenuClick } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [convSearch, setConvSearch]     = useState('');
  const [sidebarOpen, setSidebarOpen]   = useState(true);

  const docsParam = searchParams.get('docs') ?? searchParams.get('docId') ?? '';
  const scopeIds  = useMemo(() => docsParam.split(',').filter(Boolean), [docsParam]);
  const convId    = searchParams.get('convId') ?? null;
  const initialQ  = searchParams.get('q') ?? null;

  const { documents } = useDocuments();
  const { conversations, deleteConv, refetch: refetchConvs } = useConversations();

  const completedDocs = documents.filter(d => d.status === 'completed');
  const scopeNames = scopeIds.map(id => documents.find(d => d.id === id)?.name).filter(Boolean);

  const filteredConvs = conversations.filter(c => {
    const q = convSearch.toLowerCase();
    return c.title.toLowerCase().includes(q) ||
      (c.documentNames ?? [c.documentName]).some(n => n?.toLowerCase().includes(q));
  });

  const handleNewChat = () => setSearchParams(scopeIds.length ? { docs: scopeIds.join(',') } : {});

  const handleConvCreated = useCallback((newConvId) => {
    refetchConvs();
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('convId', newConvId);
      return next;
    });
  }, [refetchConvs, setSearchParams]);

  const handleScopeChange = (ids) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('docId');
      next.set('docs', ids.join(','));
      return next;
    });
    if (convId) refetchConvs();
  };

  const consumeInitialQuestion = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('q');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const subtitle = scopeIds.length === 0
    ? 'Select a document'
    : scopeNames.length > 1
      ? `Researching across ${scopeNames.length} documents`
      : scopeNames[0] ?? 'Loading…';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Research Chat"
        subtitle={subtitle}
        onMenuClick={onMenuClick}
        actions={
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="hidden lg:flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {sidebarOpen ? 'Hide' : 'Show'} history
          </button>
        }
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* History sidebar */}
        {sidebarOpen && (
          <div className="hidden lg:flex flex-col w-[240px] border-r border-gray-200 bg-white flex-shrink-0">
            {/* Search */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search chats…"
                  value={convSearch}
                  onChange={e => setConvSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 bg-gray-50 transition-colors"
                />
              </div>
            </div>

            {/* Completed docs list */}
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Documents</p>
                {completedDocs.length > 1 && (
                  <button
                    onClick={() => setSearchParams({ docs: completedDocs.slice(0, 10).map(d => d.id).join(',') })}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 hover:text-indigo-800"
                    title="Research across all processed documents (max 10)"
                  >
                    <Layers className="w-3 h-3" /> All
                  </button>
                )}
              </div>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {completedDocs.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => setSearchParams({ docs: doc.id })}
                    className={clsx(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors',
                      scopeIds.length === 1 && scopeIds[0] === doc.id
                        ? 'bg-gray-100 text-gray-900'
                        : scopeIds.includes(doc.id) ? 'bg-indigo-50/60 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <FileText className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    <span className="text-xs truncate">{doc.name}</span>
                  </button>
                ))}
                {completedDocs.length === 0 && (
                  <p className="text-xs text-gray-400 px-2 py-1">No completed documents yet.</p>
                )}
              </div>
            </div>

            {/* Conversation history */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">History</p>
              {filteredConvs.length === 0 ? (
                <p className="text-xs text-gray-400 text-center mt-4">No conversations yet</p>
              ) : (
                <div className="space-y-0.5">
                  {filteredConvs.map(conv => (
                    <div
                      key={conv.id}
                      className={clsx(
                        'group flex items-start gap-1 px-2 py-2 rounded-lg cursor-pointer transition-colors',
                        convId === conv.id ? 'bg-gray-100' : 'hover:bg-gray-50'
                      )}
                      onClick={() => setSearchParams({ docs: (conv.documentIds ?? [conv.documentId]).join(','), convId: conv.id })}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-gray-800 truncate block">{conv.title}</span>
                        <span className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                          {conv.documentIds?.length > 1 && (
                            <span className="inline-flex items-center gap-0.5 text-indigo-500">
                              <Layers className="w-2.5 h-2.5" />{conv.documentIds.length}
                            </span>
                          )}
                          {formatDate(conv.timestamp)}
                        </span>
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          deleteConv(conv.id);
                          if (convId === conv.id) handleNewChat();
                        }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 text-gray-400 transition-all flex-shrink-0"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* New chat button */}
            <div className="p-3 border-t border-gray-100">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New Chat
              </button>
            </div>
          </div>
        )}

        {/* Chat area */}
        <ChatWindow
          documents={documents}
          scopeIds={scopeIds}
          onScopeChange={handleScopeChange}
          conversationId={convId}
          onNewChat={handleNewChat}
          onConvCreated={handleConvCreated}
          onTurnComplete={refetchConvs}
          initialQuestion={initialQ}
          onInitialQuestionConsumed={consumeInitialQuestion}
        />
      </div>
    </div>
  );
}
