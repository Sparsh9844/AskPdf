import { Check, Loader2 } from 'lucide-react';
import clsx from 'clsx';

const STAGE_LABELS = {
  uploading: 'Uploading',
  parsing:   'Parsing',
  chunking:  'Chunking',
  embedding: 'Embedding',
  indexing:  'Indexing',
  analyzing: 'Analyzing',
  completed: 'Completed',
};

/**
 * ProcessingStatus — horizontal stage timeline shown during upload
 * Props:
 *   stages     — array of stage keys
 *   currentIdx — index of active stage
 */
export default function ProcessingStatus({ stages, currentIdx }) {
  return (
    <div className="flex items-center gap-0">
      {stages.map((stage, i) => {
        const done    = i < currentIdx;
        const active  = i === currentIdx;
        const pending = i > currentIdx;

        return (
          <div key={stage} className="flex items-center flex-1 min-w-0">
            {/* Node */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={clsx(
                  'w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                  done    && 'border-gray-900 bg-gray-900',
                  active  && 'border-gray-900 bg-white',
                  pending && 'border-gray-200 bg-white'
                )}
              >
                {done && <Check className="w-3 h-3 text-white" strokeWidth={2.5} />}
                {active && <Loader2 className="w-3 h-3 text-gray-900 animate-spin" />}
                {pending && <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />}
              </div>
              <span
                className={clsx(
                  'text-[10px] font-medium whitespace-nowrap transition-colors duration-300',
                  done    && 'text-gray-700',
                  active  && 'text-gray-900',
                  pending && 'text-gray-400'
                )}
              >
                {STAGE_LABELS[stage] ?? stage}
              </span>
            </div>

            {/* Connector line (not after last) */}
            {i < stages.length - 1 && (
              <div
                className={clsx(
                  'h-0.5 flex-1 mx-1 rounded-full transition-colors duration-500',
                  i < currentIdx ? 'bg-gray-900' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
