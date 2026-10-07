import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../Navbar/Navbar';
import { Sidebar } from '../Sidebar/Sidebar';

export const Layout: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Navigation Sidebar (Desktop fixed + Mobile slide-over) */}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area: Offset by sidebar width on desktop */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64 transition-all duration-200">
        {/* Top Navigation Bar */}
        <Navbar onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)} />

        {/* Page Main Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto transition-all">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
