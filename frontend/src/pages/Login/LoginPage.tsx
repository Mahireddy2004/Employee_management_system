import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, Building2, Eye, EyeOff, Lock, Mail, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to /dashboard
  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address format.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || isSubmitting) {
      return;
    }

    setServerError(null);
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
        if (axiosErr.response?.status === 401) {
          setServerError('Invalid email or password. Please verify your credentials and try again.');
        } else if (axiosErr.response?.data?.message) {
          setServerError(axiosErr.response.data.message);
        } else {
          setServerError('Unable to connect to the authentication service. Please verify that the backend API is running.');
        }
      } else {
        setServerError('Network connectivity error. Please check your connection or server status.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('admin@example.com');
    setPassword('Admin@123');
    setValidationErrors({});
    setServerError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/30 text-white mb-4">
            <Users className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white m-0">
            Employee Management
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Secure Human Resources & Operations Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8">
          <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 m-0">Sign In</h2>
              <p className="text-xs text-slate-500 mt-0.5">Enter your organizational credentials</p>
            </div>
            <div className="flex items-center space-x-1 text-xs text-indigo-600 font-medium bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>JWT Auth</span>
            </div>
          </div>

          {/* Server / Auth Error Alert */}
          {serverError && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start space-x-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="leading-snug">{serverError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Work Email Address
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (validationErrors.email) {
                      setValidationErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="name@company.com"
                  aria-invalid={!!validationErrors.email}
                  aria-describedby={validationErrors.email ? 'email-error' : undefined}
                  className={`block w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/50 border rounded-xl transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                    validationErrors.email
                      ? 'border-rose-300 text-rose-900 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-slate-200 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500'
                  }`}
                />
              </div>
              {validationErrors.email && (
                <p id="email-error" className="text-xs text-rose-600 mt-1.5 font-medium flex items-center space-x-1">
                  <span>{validationErrors.email}</span>
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (validationErrors.password) {
                      setValidationErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  placeholder="••••••••••••"
                  aria-invalid={!!validationErrors.password}
                  aria-describedby={validationErrors.password ? 'password-error' : undefined}
                  className={`block w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50/50 border rounded-xl transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                    validationErrors.password
                      ? 'border-rose-300 text-rose-900 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-slate-200 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {validationErrors.password && (
                <p id="password-error" className="text-xs text-rose-600 mt-1.5 font-medium flex items-center space-x-1">
                  <span>{validationErrors.password}</span>
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                isLoading={isSubmitting}
                className="w-full py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In to Dashboard'}
              </Button>
            </div>
          </form>

          {/* Quick Demo Helper */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center space-x-1 text-slate-400">
              <Building2 className="w-3.5 h-3.5" />
              <span>HR Admin Demo</span>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline focus:outline-none"
            >
              Fill Demo Credentials
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Protected by role-based access control and ASP.NET Core JWT authentication.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

