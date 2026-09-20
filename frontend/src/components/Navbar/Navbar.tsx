import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';

export interface NavbarProps {
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Safe fallback values to avoid displaying 'undefined' or 'null'
  const displayName = user?.username?.trim() || user?.email?.trim() || 'Administrator';
  const displayRole = user?.role?.trim() || 'HR Admin';
  const initial = displayName.charAt(0).toUpperCase() || 'A';

  return (
    <header className="h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center space-x-3">
        {/* Mobile Navigation Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl md:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Portal Breadcrumb / Title */}
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-800 text-sm sm:text-base tracking-tight">
            Employee Portal
          </span>
          <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <Shield className="w-3 h-3 text-indigo-500" />
            <span>Secured</span>
          </span>
        </div>
      </div>

      {/* User Information & Actions */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="flex items-center space-x-2.5 text-sm">
          {/* Avatar badge */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-xs select-none">
            {initial}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="font-semibold text-slate-800 text-xs sm:text-sm leading-tight truncate max-w-[160px]">
              {displayName}
            </span>
            <span className="text-[11px] font-medium text-slate-400 leading-tight">
              {displayRole}
            </span>
          </div>
        </div>

        {/* Logout Action */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="flex items-center space-x-1.5 border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 focus-visible:ring-rose-500"
          aria-label="Log out of account"
        >
          <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
};

export default Navbar;
