import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

/** Labelled input; password fields get a show/hide toggle. */
export default function Field({ label, type = 'text', hint, error, ...props }) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  return (
    <label className="block">
      <span className="flex items-center justify-between text-sm font-medium text-gray-700">
        {label}
        {hint}
      </span>
      <span className="relative block mt-1.5">
        <input
          type={isPassword && visible ? 'text' : type}
          className={clsx(
            'w-full h-11 px-3.5 text-sm rounded-lg border bg-white text-gray-900 placeholder-gray-400 transition-colors',
            'focus:outline-none focus:ring-4',
            error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
              : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-100',
            isPassword && 'pr-11'
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible(v => !v)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-md text-gray-400 hover:text-gray-700"
            aria-label={visible ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </span>
    </label>
  );
}
