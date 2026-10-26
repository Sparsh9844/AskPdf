import { useState, useRef, useEffect } from 'react';
import { Plus, X, FileText, Layers, Check } from 'lucide-react';
import clsx from 'clsx';

const MAX_SCOPE = 10;

/**
 * ScopeBar — which documents the conversation researches across.
 * Shows a chip per document plus an "Add document" picker.
 */
export default function ScopeBar({ documents, scopeIds, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const byId   = new Map(documents.map(d => [d.id, d]));
  const inScope = scopeIds.map(id => byId.get(id)).filter(Boolean);
  const ready   = documents.filter(d => d.status === 'completed');

  const toggle = (id) => {
    if (scopeIds.includes(id)) {
      if (scopeIds.length > 1) onChange(scopeIds.filter(x => x !== id));
    } else if (scopeIds.length < MAX_SCOPE) {
      onChange([...scopeIds, id]);
    }
  };

  return (
    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
      {inScope.length > 1 && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 mr-0.5">
          <Layers className="w-3.5 h-3.5" /> {inScope.length} docs
        </span>
      )}
      {inScope.map(doc => (
        <span
          key={doc.id}
          className="inline-flex items-center gap-1.5 max-w-[220px] h-7 pl-2 pr-1 rounded-lg bg-gray-100 text-xs text-gray-700"
          title={doc.name}
        >
          <FileText className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <span className="truncate">{doc.name}</span>
          {inScope.length > 1 && !disabled ? (
            <button
              onClick={() => toggle(doc.id)}
              className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700"
              aria-label={`Remove ${doc.name} from scope`}
            >
              <X className="w-3 h-3" />
            </button>
          ) : <span className="w-1" />}
        </span>
      ))}

      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          disabled={disabled}
          className="inline-flex items-center gap-1 h-7 px-2 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add document</span>
        </button>

        {open && (
          <div className="absolute left-0 top-9 z-30 w-72 max-h-80 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl p-1.5 animate-fade-in">
            <p className="px-2 pt-1 pb-2 text-[11px] text-gray-500">
              Research across several documents at once — great for comparisons.
            </p>
            {ready.length === 0 && <p className="px-2 py-2 text-xs text-gray-400">No processed documents.</p>}
            {ready.map(doc => {
              const selected = scopeIds.includes(doc.id);
              const locked   = selected && scopeIds.length === 1;
              return (
                <button
                  key={doc.id}
                  onClick={() => toggle(doc.id)}
                  disabled={locked || (!selected && scopeIds.length >= MAX_SCOPE)}
                  className={clsx(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors disabled:opacity-50',
                    selected ? 'bg-indigo-50 text-indigo-900' : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <span className={clsx(
                    'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                    selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                  )}>
                    {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </span>
                  <span className="truncate flex-1">{doc.name}</span>
                  {doc.brief?.documentType && (
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{doc.brief.documentType}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
