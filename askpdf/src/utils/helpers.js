/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format a date string relative to now or as a locale date
 */
export function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Truncate a string to a max length, appending ellipsis
 */
export function truncate(str, maxLen = 60) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen).trim() + '…' : str;
}

const PROCESSING_STATUSES = new Set(['uploading', 'parsing', 'chunking', 'embedding', 'indexing', 'analyzing']);

/** Whether a document is still moving through the ingestion pipeline */
export const isProcessing = (status) => PROCESSING_STATUSES.has(status);

/**
 * Return CSS classes for a given processing status
 */
export function statusMeta(status) {
  const map = {
    completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    analyzing: { label: 'Analyzing', color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200',  dot: 'bg-indigo-500'  },
    indexing:  { label: 'Indexing',  color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200',  dot: 'bg-violet-500'  },
    embedding: { label: 'Embedding', color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    dot: 'bg-blue-500'    },
    chunking:  { label: 'Chunking',  color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
    parsing:   { label: 'Parsing',   color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  dot: 'bg-orange-500'  },
    uploading: { label: 'Uploading', color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200',     dot: 'bg-sky-500'     },
    error:     { label: 'Error',     color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     dot: 'bg-red-500'     },
    pending:   { label: 'Pending',   color: 'text-gray-600',    bg: 'bg-gray-100',   border: 'border-gray-200',    dot: 'bg-gray-400'    },
  };
  return map[status] ?? map.pending;
}

/**
 * Clamp a number between min and max
 */
export function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}
