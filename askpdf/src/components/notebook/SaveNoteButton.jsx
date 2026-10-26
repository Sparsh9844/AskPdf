import { useState } from 'react';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { notesApi } from '../../services/api';

/**
 * SaveNoteButton — pin a finding (with its citations) to the notebook.
 *
 * Props:
 *   buildNote  — () => note payload for POST /api/notes
 *   label      — button text (default "Save")
 */
export default function SaveNoteButton({ buildNote, label = 'Save', className }) {
  const [state, setState] = useState('idle');   // idle | saving | saved | error

  const save = async () => {
    if (state === 'saving' || state === 'saved') return;
    setState('saving');
    try {
      await notesApi.create(buildNote());
      setState('saved');
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2500);
    }
  };

  return (
    <button
      onClick={save}
      disabled={state === 'saving'}
      title={state === 'saved' ? 'Saved to your notebook' : 'Save to notebook'}
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors',
        state === 'saved'  ? 'bg-amber-50 text-amber-700'
        : state === 'error' ? 'bg-red-50 text-red-600'
        : 'text-gray-500 hover:bg-amber-50 hover:text-amber-700',
        className
      )}
    >
      {state === 'saving' ? <Loader2 className="w-3 h-3 animate-spin" />
        : state === 'saved' ? <BookmarkCheck className="w-3 h-3" />
        : <Bookmark className="w-3 h-3" />}
      {state === 'saved' ? 'Saved' : state === 'error' ? 'Failed' : label}
    </button>
  );
}
