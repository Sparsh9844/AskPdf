import { useNavigate, useOutletContext } from 'react-router-dom';
import { Upload, ArrowRight, MessageSquare, FileText, Clock } from 'lucide-react';
import { useState } from 'react';
import Header from '../components/layout/Header';
import DashboardStats from '../components/dashboard/DashboardStats';
import KnowledgeMap from '../components/dashboard/KnowledgeMap';
import { useAuth } from '../hooks/useAuth';
import ToolLauncher from '../components/dashboard/ToolLauncher';
import UploadDropzone from '../components/upload/UploadDropzone';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import { useStats } from '../hooks/useStats';
import { useDocuments } from '../hooks/useDocuments';
import { useConversations } from '../hooks/useConversations';
import { formatDate, formatBytes } from '../utils/helpers';

export default function Dashboard() {
  const { onMenuClick } = useOutletContext();
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);

  const { user }                             = useAuth();
  const { stats }                            = useStats();
  const { documents, refetch: refetchDocs }  = useDocuments();
  const { conversations }                    = useConversations();

  const recent      = documents.slice(0, 4);
  const recentConvs = conversations.slice(0, 4);

  const handleUploadComplete = () => {
    refetchDocs();
    setTimeout(() => setShowUpload(false), 1500);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Dashboard"
        subtitle={user ? `Welcome back, ${user.name.split(' ')[0]}` : 'Your document intelligence workspace'}
        onMenuClick={onMenuClick}
        actions={
          <Button icon={Upload} size="sm" onClick={() => setShowUpload(u => !u)}>
            <span className="hidden sm:inline">Upload</span>
          </Button>
        }
      />

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Upload panel */}
        {showUpload && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Upload a document</h2>
              <button onClick={() => setShowUpload(false)} className="text-xs text-gray-500 hover:text-gray-700">
                Cancel
              </button>
            </div>
            <UploadDropzone onUploadComplete={handleUploadComplete} />
          </div>
        )}

        {/* Stats row */}
        <DashboardStats stats={stats} />

        {/* Ways to work */}
        <ToolLauncher stats={stats} />

        {/* Topics across the library */}
        <KnowledgeMap documents={documents} />

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Documents */}
          <section className="bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" strokeWidth={1.75} />
                <h2 className="text-sm font-semibold text-gray-900">Recent Documents</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/documents')} iconRight={ArrowRight}>
                View all
              </Button>
            </div>
            {recent.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No documents yet — upload your first document.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recent.map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => navigate(`/documents/${doc.id}`)}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-red-500" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {doc.brief?.documentType && <span className="text-indigo-600">{doc.brief.documentType} · </span>}
                        {formatBytes(doc.size)} · {formatDate(doc.uploadedAt)}
                      </p>
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Conversations */}
          <section className="bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-500" strokeWidth={1.75} />
                <h2 className="text-sm font-semibold text-gray-900">Recent Chats</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/chat')} iconRight={ArrowRight}>
                View all
              </Button>
            </div>
            {recentConvs.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No conversations yet — start chatting with a document.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentConvs.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => navigate(`/chat?docs=${(conv.documentIds ?? [conv.documentId]).join(',')}&convId=${conv.id}`)}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 text-blue-500" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{conv.title}</p>
                      <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[11px] text-gray-400">{formatDate(conv.timestamp)}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{conv.messageCount} msgs</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Processing activity */}
        <section className="bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Clock className="w-4 h-4 text-gray-500" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-gray-900">Processing Activity</h2>
          </div>
          <div className="p-5 space-y-3">
            {documents.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No documents yet.</p>
            ) : documents.map(doc => {
              const stageMap = { uploading: 1, parsing: 2, chunking: 3, embedding: 4, indexing: 5, analyzing: 6, completed: 7, error: 0 };
              const pct = doc.status === 'error' ? 0 : doc.status === 'completed' ? 100 : ((stageMap[doc.status] ?? 0) / 7) * 100;
              return (
                <div key={doc.id} className="flex items-center gap-3">
                  <div className="w-36 lg:w-48 flex-shrink-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{doc.name}</p>
                  </div>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        doc.status === 'error' ? 'bg-red-400' :
                        doc.status === 'completed' ? 'bg-emerald-500' : 'bg-gray-700'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <StatusBadge status={doc.status} className="flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
