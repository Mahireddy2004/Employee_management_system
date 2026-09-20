import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute/ProtectedRoute';
import { Layout } from './components/Layout/Layout';
import { Loading } from './components/Loading/Loading';

// Code-split route components for optimal initial bundle performance
const LoginPage = lazy(() => import('./pages/Login/LoginPage'));
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'));
const EmployeesPage = lazy(() => import('./pages/Employees/EmployeesPage'));
const DepartmentsPage = lazy(() => import('./pages/Departments/DepartmentsPage'));
const AttendancePage = lazy(() => import('./pages/Attendance/AttendancePage'));
const ReportsPage = lazy(() => import('./pages/Reports/ReportsPage'));

/**
 * Fallback redirect component:
 * - Redirects authenticated users to /dashboard.
 * - Redirects unauthenticated users to /login.
 */
const FallbackRedirect: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loading message="Loading session..." />;
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<Loading message="Loading portal resources..." />}>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<FallbackRedirect />} />

        {/* Public Route (accessible without auth; redirects to /dashboard if authenticated) */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Protected Application Routes (require auth, render inside Layout) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/departments" element={<DepartmentsPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
        </Route>

        {/* Catch-all fallback route for unknown paths */}
        <Route path="*" element={<FallbackRedirect />} />
      </Routes>
    </Suspense>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
