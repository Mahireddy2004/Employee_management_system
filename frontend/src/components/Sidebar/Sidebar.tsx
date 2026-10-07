import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  FileSpreadsheet,
  LayoutDashboard,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const navigationItems = isAdmin
    ? [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Leave Approvals', path: '/leaves', icon: CalendarDays },
        { name: 'Employees', path: '/employees', icon: Users },
        { name: 'Departments', path: '/departments', icon: Building2 },
        { name: 'Attendance', path: '/attendance', icon: CalendarCheck },
        { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
      ]
    : [
        { name: 'My Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Apply for Leave', path: '/leaves', icon: CalendarDays, highlight: true },
        { name: 'My Attendance', path: '/attendance', icon: CalendarCheck },
        { name: 'Department Hub', path: '/departments', icon: Building2 },
      ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container: Fixed on Desktop, Slide-over Drawer on Mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:shadow-none'
        } border-r border-slate-800/80`}
        aria-label="Sidebar Navigation"
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-xs shadow-indigo-500/20">
              <span className="block w-5 h-5 text-center font-bold leading-5" aria-hidden="true">
                N
              </span>
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight block leading-none">
                Nynik
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block mt-1">
                Technologies
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 md:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3.5 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>{isAdmin ? 'Management Menu' : 'Employee Portal'}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                isAdmin
                  ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/60'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
              }`}
            >
              {isAdmin ? 'Admin' : 'Staff'}
            </span>
          </div>

          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 select-none ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                      : item.highlight
                      ? 'text-emerald-300 bg-emerald-950/40 border border-emerald-700/50 hover:bg-emerald-900/50'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.highlight && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 shadow-xs">
                    Apply
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* System Status / Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            {isAdmin ? (
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            ) : (
              <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="truncate">
              {isAdmin ? 'Admin Management Mode' : 'Employee Self-Service'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 pl-6">Version 1.0.0</div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
