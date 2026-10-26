import { useState } from 'react';
import { FileText, MessageSquare, MoreHorizontal, Trash2, RefreshCw, Calendar, Hash, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatBytes, formatDate } from '../../utils/helpers';
import StatusBadge from '../ui/StatusBadge';

/**
 * DocumentCard — grid card for a single document; opens its brief
 */
export default function DocumentCard({ doc, onDelete, onReprocess }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleChat = (e) => {
    e.stopPropagation();
    navigate(`/chat?docs=${doc.id}`);
  };

  return (
    <div
      className="group bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer relative animate-fade-in"
      onClick={() => navigate(`/documents/${doc.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-red-500" strokeWidth={1.75} />
        </div>

        {/* Actions menu */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            className="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Document options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-7 z-20 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 animate-fade-in"
              onBlur={() => setMenuOpen(false)}
            >
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => { handleChat({ stopPropagation: () => {} }); setMenuOpen(false); }}
              >
                <MessageSquare className="w-3.5 h-3.5" /> Ask questions
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => { navigate(`/documents/${doc.id}`); setMenuOpen(false); }}
              >
                <Sparkles className="w-3.5 h-3.5" /> View brief
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => { onReprocess?.(doc.id); setMenuOpen(false); }}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reprocess
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                onClick={() => { onDelete?.(doc.id); setMenuOpen(false); }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* File name */}
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{doc.name}</p>
        <p className="text-xs text-gray-500 mt-1">
          {doc.brief?.documentType && <span className="text-indigo-600 font-medium">{doc.brief.documentType} · </span>}
          {formatBytes(doc.size)} · {doc.pages} pages
        </p>
        {doc.brief?.summary && (
          <p className="text-xs text-gray-500 leading-relaxed mt-2 line-clamp-3">{doc.brief.summary}</p>
        )}
      </div>

      {/* Status */}
      <StatusBadge status={doc.status} />

      {/* Meta footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1 text-gray-400">
          <Calendar className="w-3 h-3" />
          <span className="text-[11px]">{formatDate(doc.uploadedAt)}</span>
        </div>
        <div className="flex items-center gap-3">
          {doc.chunks > 0 && (
            <div className="flex items-center gap-1 text-gray-400">
              <Hash className="w-3 h-3" />
              <span className="text-[11px]">{doc.chunks}</span>
            </div>
          )}
          {doc.conversations > 0 && (
            <div className="flex items-center gap-1 text-gray-400">
              <MessageSquare className="w-3 h-3" />
              <span className="text-[11px]">{doc.conversations}</span>
            </div>
          )}
        </div>
      </div>

      {/* Chat CTA — visible on hover */}
      {doc.status === 'completed' && (
        <button
          onClick={handleChat}
          className="absolute inset-x-4 bottom-[52px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-1.5 h-7 bg-gray-900 text-white text-xs font-medium rounded-lg"
        >
          <MessageSquare className="w-3.5 h-3.5" /> Ask Questions
        </button>
      )}
    </div>
  );
}
