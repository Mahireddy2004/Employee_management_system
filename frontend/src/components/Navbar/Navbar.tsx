import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, LogOut, Menu, Moon, Shield, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../common/Button';

export interface NavbarProps {
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Safe fallback values to avoid displaying 'undefined' or 'null'
  const isAdmin = user?.role === 'Admin';
  const displayName = user?.username?.trim() || user?.email?.trim() || (isAdmin ? 'Administrator' : 'Staff Employee');
  const displayRole = isAdmin ? 'Manager / HR Admin' : 'Staff Employee';
  const initial = displayName.charAt(0).toUpperCase() || (isAdmin ? 'A' : 'E');

  return (
    <header className="h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200/90 dark:border-slate-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs transition-colors duration-200">
      <div className="flex items-center space-x-3">
        {/* Mobile Navigation Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl md:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Portal Breadcrumb / Title */}
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm sm:text-base tracking-tight">
            Nynik Portal
          </span>
          <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Shield className={`w-3 h-3 ${isAdmin ? 'text-indigo-500' : 'text-emerald-500'}`} />
            <span>{isAdmin ? 'Manager Portal' : 'Employee Portal'}</span>
          </span>
        </div>
      </div>

      {/* User Information & Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Persistent "Apply for Leave" Global Quick Action Button */}
        <button
          type="button"
          onClick={() => navigate('/leaves?action=apply')}
          className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer ring-2 ring-emerald-400/40"
          title="Quickly apply for time off or vacation"
        >
          <CalendarPlus className="w-4 h-4 stroke-[2.5]" />
          <span>Apply for Leave</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* User Badge */}
        <div className="flex items-center space-x-2.5 text-sm">
          {/* Avatar badge */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-xs select-none">
            {initial}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="font-semibold text-slate-800 dark:text-slate-100 text-xs sm:text-sm leading-tight truncate max-w-[160px]">
              {displayName}
            </span>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400 leading-tight">
              {displayRole}
            </span>
          </div>
        </div>

        {/* Logout Action */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="flex items-center space-x-1.5 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 dark:hover:border-rose-800 focus-visible:ring-rose-500"
          aria-label="Log out of account"
        >
          <LogOut className="w-4 h-4 text-slate-400 dark:text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
};

export default Navbar;
