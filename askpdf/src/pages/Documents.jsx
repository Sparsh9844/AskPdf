import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Search, Upload, LayoutGrid, List, FileText } from 'lucide-react';
import Header from '../components/layout/Header';
import DocumentCard from '../components/documents/DocumentCard';
import StatusBadge from '../components/ui/StatusBadge';
import UploadDropzone from '../components/upload/UploadDropzone';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { useDocuments } from '../hooks/useDocuments';
import { formatBytes, formatDate } from '../utils/helpers';

const STATUS_FILTERS = ['all', 'completed', 'analyzing', 'indexing', 'embedding', 'chunking', 'parsing', 'uploading', 'error'];

export default function Documents() {
  const { onMenuClick }  = useOutletContext();
  const navigate = useNavigate();
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('all');
  const [view, setView]             = useState('grid');
  const [showUpload, setShowUpload] = useState(false);

  const { documents, loading, error, refetch, deleteDoc, reprocessDoc } = useDocuments();

  const filtered = documents.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || d.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Documents"
        subtitle={loading ? 'Loading…' : `${documents.length} document${documents.length !== 1 ? 's' : ''}`}
        onMenuClick={onMenuClick}
        actions={
          <Button icon={Upload} size="sm" onClick={() => setShowUpload(u => !u)}>
            <span className="hidden sm:inline">Upload</span>
          </Button>
        }
      />

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={refetch} className="text-xs underline">Retry</button>
          </div>
        )}

        {/* Upload zone */}
        {showUpload && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-900">Upload a document</span>
              <button onClick={() => setShowUpload(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
            <UploadDropzone onUploadComplete={() => { refetch(); setTimeout(() => setShowUpload(false), 1500); }} />
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg overflow-x-auto">
              {STATUS_FILTERS.map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-3 h-7 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    filter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex gap-0.5 bg-gray-100 p-0.5 rounded-lg flex-shrink-0">
              <button onClick={() => setView('grid')} className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`} aria-label="Grid view">
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`} aria-label="List view">
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          {loading ? 'Loading documents…' : `Showing ${filtered.length} of ${documents.length}`}
          {filter !== 'all' && <span className="ml-1">· filtered by <strong>{filter}</strong></span>}
        </p>

        {/* Grid / List */}
        {!loading && filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents found"
            description={search ? `No documents match "${search}"` : 'Upload your first document to get started.'}
            action={!search && <Button icon={Upload} onClick={() => setShowUpload(true)}>Upload</Button>}
          />
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(doc => (
              <DocumentCard key={doc.id} doc={doc} onDelete={deleteDoc} onReprocess={reprocessDoc} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 hidden sm:table-cell">Size</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 hidden md:table-cell">Uploaded</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-600 hidden lg:table-cell">Chunks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate(`/documents/${doc.id}`)}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-red-50 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-3.5 h-3.5 text-red-500" />
                        </div>
                        <span className="font-medium text-gray-800 truncate max-w-[200px]">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">{formatBytes(doc.size)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{formatDate(doc.uploadedAt)}</td>
                    <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                    <td className="px-5 py-3 text-right text-xs text-gray-500 hidden lg:table-cell">{doc.chunks?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
