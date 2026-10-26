import { useRef, useState } from 'react';
import { Send, Zap, Telescope, Square } from 'lucide-react';
import clsx from 'clsx';

const MODES = [
  { id: 'quick', label: 'Quick',         icon: Zap,       hint: 'Fast, focused answer' },
  { id: 'deep',  label: 'Deep research', icon: Telescope, hint: 'Plans sub-questions, searches wider, writes a structured report' },
];

/**
 * ChatInput — auto-growing textarea with research-mode toggle and send/stop.
 */
export default function ChatInput({
  onSend, onStop, busy, mode, onModeChange,
  placeholder = 'Ask anything about your documents…',
}) {
  const [value, setValue] = useState('');
  const ref = useRef();

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    onSend(trimmed, mode);
    setValue('');
    if (ref.current) ref.current.style.height = 'auto';
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    setValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  return (
    <div className={clsx(
      'border rounded-2xl bg-white shadow-sm transition-all duration-200',
      mode === 'deep'
        ? 'border-indigo-300 focus-within:border-indigo-500 focus-within:shadow-md focus-within:shadow-indigo-100'
        : 'border-gray-200 hover:border-gray-300 focus-within:border-gray-400 focus-within:shadow-md'
    )}>
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKey}
        placeholder={mode === 'deep' ? 'Ask a complex question — I’ll plan the research…' : placeholder}
        rows={1}
        className="w-full px-4 pt-3 pb-2 text-sm text-gray-800 placeholder-gray-400 bg-transparent resize-none outline-none leading-relaxed"
        style={{ minHeight: 48 }}
        aria-label="Chat input"
      />
      <div className="flex items-center justify-between px-2.5 pb-2 gap-2">
        {/* Mode toggle */}
        <div className="flex items-center gap-0.5 p-0.5 bg-gray-100 rounded-lg" role="radiogroup" aria-label="Research mode">
          {MODES.map(({ id, label, icon: Icon, hint }) => (
            <button
              key={id}
              role="radio"
              aria-checked={mode === id}
              title={hint}
              onClick={() => onModeChange(id)}
              className={clsx(
                'flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-medium transition-colors',
                mode === id
                  ? id === 'deep' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              )}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline text-[11px] text-gray-400">⏎ send · ⇧⏎ newline</span>
          {busy ? (
            <button
              onClick={onStop}
              className="w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition-colors"
              aria-label="Stop generating"
              title="Stop"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!value.trim()}
              className={clsx(
                'w-8 h-8 rounded-xl text-white flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none transition-colors',
                mode === 'deep' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-900 hover:bg-gray-800'
              )}
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
