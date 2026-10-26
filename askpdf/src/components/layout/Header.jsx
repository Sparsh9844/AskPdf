import { Menu, Bell } from 'lucide-react';

/**
 * Header — top bar with page title, search, and actions
 */
export default function Header({ title, subtitle, onMenuClick, actions }) {
  return (
    <header className="sticky top-0 z-10 h-14 bg-white/90 backdrop-blur-sm border-b border-gray-200 flex items-center px-4 sm:px-6 gap-4 flex-shrink-0">
      {/* Mobile menu toggle */}
      <button
        className="lg:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-gray-900 truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-gray-500 truncate">{subtitle}</p>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {actions}
        <button
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
        </button>
      </div>
    </header>
  );
}
