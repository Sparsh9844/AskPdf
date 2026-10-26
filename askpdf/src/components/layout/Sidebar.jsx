import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, MessageSquare, Settings, ShieldCheck, GraduationCap, NotebookPen,
  ChevronLeft, ChevronRight, Sparkles, X, LogOut
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/documents',  icon: FileText,        label: 'Documents'  },
  { to: '/chat',       icon: MessageSquare,   label: 'Research'   },
  { to: '/verify',     icon: ShieldCheck,     label: 'Fact-check' },
  { to: '/study',      icon: GraduationCap,   label: 'Study'      },
  { to: '/notebook',   icon: NotebookPen,     label: 'Notebook'   },
  { to: '/settings',   icon: Settings,        label: 'Settings'   },
];

/**
 * Sidebar — collapsible left nav
 * Props: collapsed (bool), onToggle (fn), mobileOpen (bool), onMobileClose (fn)
 */
export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.name ?? '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={clsx(
          'fixed top-0 left-0 z-30 h-full flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out',
          // desktop
          'hidden lg:flex',
          collapsed ? 'lg:w-[60px]' : 'lg:w-[220px]',
          // mobile
          mobileOpen
            ? 'flex w-[220px] lg:hidden'
            : 'hidden'
        )}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className={clsx(
          'flex items-center h-14 border-b border-gray-200 flex-shrink-0 transition-all duration-300',
          collapsed ? 'justify-center px-0' : 'px-4 gap-2.5'
        )}>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" strokeWidth={2} />
          </div>
          {!collapsed && (
            <span className="font-semibold text-gray-900 text-[15px] tracking-tight">Insight</span>
          )}
          {/* Mobile close */}
          <button
            className="ml-auto lg:hidden p-1 rounded-md hover:bg-gray-100"
            onClick={onMobileClose}
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'group flex items-center rounded-lg transition-colors duration-150 text-sm font-medium',
                  collapsed ? 'justify-center h-9 w-9 mx-auto' : 'gap-3 px-3 h-9',
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
              title={collapsed ? label : undefined}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle — desktop only */}
        <div className="hidden lg:flex px-2 pb-4">
          <button
            onClick={onToggle}
            className={clsx(
              'flex items-center justify-center w-full h-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-150 text-xs gap-1.5',
              collapsed ? 'w-9 mx-auto' : ''
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <><ChevronLeft className="w-4 h-4" /><span className="text-xs">Collapse</span></>
            }
          </button>
        </div>

        {/* Signed-in user */}
        <div className={clsx('border-t border-gray-200 pt-3 pb-4', collapsed ? 'px-2' : 'px-3')}>
          <div className={clsx('flex items-center', collapsed ? 'flex-col gap-2' : 'gap-2.5')}>
            <button
              onClick={() => navigate('/settings')}
              className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0"
              title={user ? `${user.name} · ${user.email}` : 'Account'}
            >
              <span className="text-white text-[11px] font-semibold">{initials}</span>
            </button>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
              </div>
            )}
            <button
              onClick={signOut}
              className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
