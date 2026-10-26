import { statusMeta, isProcessing } from '../../utils/helpers';
import clsx from 'clsx';

/**
 * StatusBadge — small pill showing document processing status
 * Props: status ('completed' | 'analyzing' | 'indexing' | 'chunking' | 'parsing' | 'uploading' | 'error' | 'pending')
 */
export default function StatusBadge({ status, className }) {
  const meta = statusMeta(status);

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        meta.bg, meta.color, meta.border,
        className
      )}
    >
      <span
        className={clsx(
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          meta.dot,
          isProcessing(status) && 'animate-pulse'
        )}
      />
      {meta.label}
    </span>
  );
}
