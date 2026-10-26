import { useState, memo } from 'react';
import { Sparkles, User, Copy, Check, BookOpen } from 'lucide-react';
import clsx from 'clsx';
import { formatDate } from '../../utils/helpers';
import { renderMarkdown } from '../../utils/markdown';
import Citation from './Citation';
import ResearchTrace from './ResearchTrace';
import GroundingBadge from './GroundingBadge';
import SaveNoteButton from '../notebook/SaveNoteButton';

/** Strip citation markers for clean copy-paste. */
const plainText = (s) => s.replace(/\s?\[\d+(?:\s*[,–-]\s*\d+)*\]/g, '');

/**
 * AnswerBody — markdown answer with interactive citation chips.
 * Shared by persisted messages and the live streaming answer.
 */
export function AnswerBody({ content, sources = [], onCitationClick, activeIndex, streaming }) {
  const byIndex = new Map(sources.map((s, i) => [s.index ?? i + 1, s]));
  return (
    <div className="text-gray-800">
      {renderMarkdown(content, {
        renderCitation: (n, key) => (
          <Citation
            key={key}
            n={n}
            source={byIndex.get(n)}
            active={activeIndex === n}
            onClick={onCitationClick}
          />
        ),
      })}
      {streaming && <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-0.5 animate-pulse align-middle rounded-sm" />}
    </div>
  );
}

/**
 * ChatMessage — renders a single user or assistant message
 *
 * Props:
 *   message           — message object (assistant messages may carry trace, grounding, sources)
 *   onOpenSources     — (message, source?) => void — open the source panel for this message
 *   isActive          — this message's sources are open in the evidence panel
 *   activeIndex       — citation number highlighted in the panel (when active)
 *   question          — the question this answer responds to (for saving)
 *   saveContext       — { documentIds, documentNames, conversationId } (for saving)
 */
function ChatMessage({ message, onOpenSources, isActive, activeIndex, question, saveContext }) {
  const [copied, setCopied] = useState(false);

  const isUser     = message.role === 'user';
  const sources    = message.sources ?? [];
  const citedCount = sources.filter(s => s.cited).length;

  const copyText = () => {
    navigator.clipboard.writeText(plainText(message.content));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (isUser) {
    return (
      <div className="flex gap-3 flex-row-reverse animate-slide-up">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex flex-col items-end gap-1 max-w-[85%]">
          <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm bg-gray-900 text-white text-sm whitespace-pre-wrap">
            {message.content}
          </div>
          <span className="text-[11px] text-gray-400">{formatDate(message.timestamp)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 group animate-slide-up">
      <div className={clsx(
        'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        message.isError ? 'bg-red-500' : 'bg-gradient-to-br from-indigo-500 to-indigo-700'
      )}>
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>

      <div className="flex flex-col gap-2 max-w-[85%] min-w-0">
        {message.trace?.length > 0 && <ResearchTrace trace={message.trace} mode={message.mode} />}

        <div className={clsx(
          'px-4 py-3 rounded-2xl rounded-tl-sm text-sm',
          message.isError
            ? 'bg-red-50 border border-red-200 text-red-800'
            : 'bg-white border border-gray-200 shadow-sm'
        )}>
          <AnswerBody
            content={message.content}
            sources={sources}
            activeIndex={isActive ? activeIndex : null}
            onCitationClick={(src) => onOpenSources?.(message, src)}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-400">{formatDate(message.timestamp)}</span>
          <GroundingBadge grounding={message.grounding} />

          {sources.length > 0 && (
            <button
              onClick={() => onOpenSources?.(message)}
              className={clsx(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors',
                isActive ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <BookOpen className="w-3 h-3" />
              {citedCount > 0 ? `${citedCount} of ${sources.length} sources cited` : `${sources.length} sources`}
            </button>
          )}

          {!message.isError && saveContext && (
            <SaveNoteButton
              buildNote={() => ({
                kind:     'answer',
                title:    (question || 'Saved answer').slice(0, 200),
                question: question ?? '',
                content:  message.content,
                sources,
                ...saveContext,
              })}
            />
          )}

          {!message.isError && (
            <button
              onClick={copyText}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-gray-100 text-gray-400 transition-all duration-150"
              aria-label="Copy answer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Finished messages never change while a new answer streams — skip re-rendering them
export default memo(ChatMessage);
