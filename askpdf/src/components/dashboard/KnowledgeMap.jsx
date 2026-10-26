import { useNavigate } from 'react-router-dom';
import { Network, Layers } from 'lucide-react';
import clsx from 'clsx';

/**
 * KnowledgeMap — topics extracted from every document's brief, merged across
 * the library. Topics shared by several documents are emphasised; clicking one
 * opens a research chat across exactly those documents.
 */
export default function KnowledgeMap({ documents }) {
  const navigate = useNavigate();

  const withBriefs = documents.filter(d => d.status === 'completed' && d.brief?.topics?.length);
  const topics = new Map();   // key → { label, docIds:Set }
  for (const d of withBriefs) {
    for (const t of d.brief.topics) {
      const key = t.toLowerCase().trim();
      const entry = topics.get(key) ?? { label: t, docIds: new Set() };
      entry.docIds.add(d.id);
      topics.set(key, entry);
    }
  }
  const list = [...topics.values()]
    .sort((a, b) => b.docIds.size - a.docIds.size || a.label.localeCompare(b.label))
    .slice(0, 40);

  const ready = documents.filter(d => d.status === 'completed');

  return (
    <section className="bg-white border border-gray-200 rounded-xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-indigo-500" strokeWidth={1.75} />
          <h2 className="text-sm font-semibold text-gray-900">Knowledge map</h2>
          {withBriefs.length > 0 && (
            <span className="text-xs text-gray-400">{list.length} topics · {withBriefs.length} documents</span>
          )}
        </div>
        {ready.length > 1 && (
          <button
            onClick={() => navigate(`/chat?docs=${ready.slice(0, 10).map(d => d.id).join(',')}`)}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" /> Ask across all
          </button>
        )}
      </div>

      <div className="p-5">
        {list.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            Topics appear here once documents have an intelligence brief. Open a document to generate one.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {list.map(({ label, docIds }) => {
              const shared = docIds.size > 1;
              return (
                <button
                  key={label}
                  onClick={() => navigate(
                    `/chat?docs=${[...docIds].join(',')}&q=${encodeURIComponent(
                      shared ? `How do these documents treat ${label}? Compare them.` : `What does the document say about ${label}?`
                    )}`
                  )}
                  title={shared ? `Mentioned in ${docIds.size} documents — click to compare` : 'Ask about this topic'}
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-full border transition-colors',
                    shared
                      ? 'px-3 py-1.5 text-sm font-medium bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100'
                      : 'px-2.5 py-1 text-xs bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-700'
                  )}
                >
                  {label}
                  {shared && (
                    <span className="text-[10px] font-semibold bg-indigo-600 text-white rounded-full px-1.5 py-px">
                      {docIds.size}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
