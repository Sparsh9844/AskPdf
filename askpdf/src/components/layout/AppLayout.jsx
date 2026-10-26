import { useState, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import clsx from 'clsx';
import Sidebar from './Sidebar';

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <span className="w-5 h-5 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

/**
 * AppLayout — wraps every page with the collapsible sidebar and main content area.
 * On desktop (≥1024px) the main column is offset by the sidebar width.
 * On mobile the sidebar is an overlay and the main column fills the full width.
 */
export default function AppLayout() {
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content — offset by the sidebar width on desktop (lg = 1024px) */}
      <div
        className={clsx(
          'flex flex-col flex-1 min-w-0 transition-all duration-300',
          collapsed ? 'lg:ml-[60px]' : 'lg:ml-[220px]'
        )}
      >
        <Suspense fallback={<PageLoader />}>
          <Outlet context={{ onMenuClick: () => setMobileOpen(true) }} />
        </Suspense>
      </div>
    </div>
  );
}
