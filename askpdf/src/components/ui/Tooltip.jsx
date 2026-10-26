import { useState } from 'react';
import clsx from 'clsx';

export default function Tooltip({ children, content, side = 'top' }) {
  const [show, setShow] = useState(false);

  const positions = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && content && (
        <div
          className={clsx(
            'absolute z-50 px-2.5 py-1 text-xs font-medium text-white bg-gray-900 rounded-md whitespace-nowrap pointer-events-none animate-fade-in',
            positions[side]
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
