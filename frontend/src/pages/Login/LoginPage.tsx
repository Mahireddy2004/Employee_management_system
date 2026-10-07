import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';

type LoginMode = 'admin' | 'employee' | 'register';

export const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LoginMode>('admin');

  // Sign in fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration fields
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [validationErrors, setValidationErrors] = useState<Record<string, string | undefined>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to /dashboard
  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateLogin = (): boolean => {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid work email format.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateRegister = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = 'Full name is required.';
    } else if (fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters.';
    }

    if (!regEmail.trim()) {
      errors.regEmail = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      errors.regEmail = 'Please enter a valid email format.';
    }

    if (!regPassword) {
      errors.regPassword = 'Password is required.';
    } else if (regPassword.length < 6) {
      errors.regPassword = 'Password must be at least 6 characters.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateLogin() || isSubmitting) {
      return;
    }

    setServerError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      parseAndSetError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateRegister() || isSubmitting) {
      return;
    }

    setServerError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await register({
        username: fullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: 'Employee',
      });
      setSuccessMessage('Welcome! Your company profile has been created. Directing you to your workplace dashboard...');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1000);
    } catch (err: unknown) {
      parseAndSetError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const parseAndSetError = (err: unknown) => {
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosErr = err as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            title?: string;
            errors?: Record<string, string[]>;
          };
        };
      };
      if (axiosErr.response?.status === 401) {
        setServerError('Invalid email or password. Please verify your credentials.');
      } else if (axiosErr.response?.data?.message) {
        setServerError(axiosErr.response.data.message);
      } else if (axiosErr.response?.data?.errors) {
        const firstError = Object.values(axiosErr.response.data.errors).flat()[0];
        setServerError(firstError || 'Validation error. Please verify your inputs.');
      } else if (axiosErr.response?.data?.title) {
        setServerError(axiosErr.response.data.title);
      } else {
        setServerError('Unable to connect to the authentication service. Please verify that the backend API is running.');
      }
    } else {
      setServerError('Network connectivity error. Please check your connection or server status.');
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string, mode: LoginMode = 'admin') => {
    setActiveTab(mode);
    setEmail(demoEmail);
    setPassword(demoPass);
    setValidationErrors({});
    setServerError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl shadow-lg shadow-indigo-500/30 text-white mb-3">
            <span className="text-2xl font-black tracking-tight" aria-hidden="true">N</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white m-0">
            Nynik Workplace Suite
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            Enterprise Human Resources, Attendance & Leave Management
          </p>
        </div>

        {/* Portal Mode Switcher Tabs */}
        <div className="bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60 mb-5 flex gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setServerError(null);
              setValidationErrors({});
            }}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'admin'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Manager Portal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('employee');
              setServerError(null);
              setValidationErrors({});
            }}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'employee'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Employee Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setServerError(null);
              setValidationErrors({});
            }}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'register'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Join Company</span>
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 sm:p-8 backdrop-blur-sm">
          {/* Subheader with description based on active mode */}
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
                {activeTab === 'admin' && 'Manager / Admin Portal'}
                {activeTab === 'employee' && 'Employee Self-Service'}
                {activeTab === 'register' && 'Join the Organization'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {activeTab === 'admin' && 'Oversight for staff payroll, attendance records & leave approvals.'}
                {activeTab === 'employee' && 'Clock-in/out, check your salary slip & submit leave requests.'}
                {activeTab === 'register' && 'Apply to join. Your manager will assign your department & salary.'}
              </p>
            </div>
            <div>
              {activeTab === 'admin' && (
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 px-2.5 py-1 rounded-full">
                  Admin
                </span>
              )}
              {activeTab === 'employee' && (
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 px-2.5 py-1 rounded-full">
                  Staff
                </span>
              )}
              {activeTab === 'register' && (
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 px-2.5 py-1 rounded-full">
                  New Joiner
                </span>
              )}
            </div>
          </div>

          {/* Success Alert */}
          {successMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm flex items-start space-x-2.5 animate-fadeIn"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-snug font-medium">{successMessage}</div>
            </div>
          )}

          {/* Server / Auth Error Alert */}
          {serverError && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-sm flex items-start space-x-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-snug">{serverError}</div>
            </div>
          )}

          {/* Tab 1 & 2: Login Form (Admin & Employee) */}
          {(activeTab === 'admin' || activeTab === 'employee') && (
            <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {activeTab === 'admin' ? 'Manager Work Email' : 'Staff Employee Email'}
                </label>
                <div className="relative rounded-xl shadow-sm">
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
                    placeholder={activeTab === 'admin' ? 'admin@example.com' : 'employee@company.com'}
                    aria-invalid={!!validationErrors.email}
                    aria-describedby={validationErrors.email ? 'email-error' : undefined}
                    className={`block w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/50 dark:bg-slate-800/60 border rounded-xl transition-all focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 ${
                      validationErrors.email
                        ? 'border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 focus:ring-rose-500 focus:border-rose-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                  />
                </div>
                {validationErrors.email && (
                  <p id="email-error" className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 font-medium flex items-center space-x-1">
                    <span>{validationErrors.email}</span>
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Password
                </label>
                <div className="relative rounded-xl shadow-sm">
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
                    className={`block w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50/50 dark:bg-slate-800/60 border rounded-xl transition-all focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 ${
                      validationErrors.password
                        ? 'border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 focus:ring-rose-500 focus:border-rose-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {validationErrors.password && (
                  <p id="password-error" className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 font-medium flex items-center space-x-1">
                    <span>{validationErrors.password}</span>
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className={`w-full py-2.5 text-sm font-semibold rounded-xl text-white shadow-sm transition-all ${
                    activeTab === 'admin'
                      ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                  }`}
                >
                  {isSubmitting
                    ? 'Authenticating...'
                    : activeTab === 'admin'
                    ? 'Sign In to Manager Portal'
                    : 'Sign In to Employee Portal'}
                </Button>
              </div>
            </form>
          )}

          {/* Tab 3: Join Company Form (Self Registration) */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} noValidate className="space-y-4">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Full Name
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (validationErrors.fullName) {
                        setValidationErrors((prev) => ({ ...prev, fullName: undefined }));
                      }
                    }}
                    placeholder="e.g. Ramesh Kumar"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl transition-all focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
                {validationErrors.fullName && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 font-medium">{validationErrors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="regEmail"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Your Email Address
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="regEmail"
                    type="email"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      if (validationErrors.regEmail) {
                        setValidationErrors((prev) => ({ ...prev, regEmail: undefined }));
                      }
                    }}
                    placeholder="ramesh@gmail.com"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl transition-all focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
                {validationErrors.regEmail && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 font-medium">{validationErrors.regEmail}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="regPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Create Password (min. 6 characters)
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="regPassword"
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => {
                      setRegPassword(e.target.value);
                      if (validationErrors.regPassword) {
                        setValidationErrors((prev) => ({ ...prev, regPassword: undefined }));
                      }
                    }}
                    placeholder="••••••••••••"
                    className="block w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50/50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl transition-all focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {validationErrors.regPassword && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 font-medium">{validationErrors.regPassword}</p>
                )}
              </div>

              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                ℹ️ After joining, your employee profile will be created automatically. The admin will verify your details, assign your department, and configure your compensation.
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className="w-full py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all"
                >
                  {isSubmitting ? 'Joining Organization...' : 'Join Company & Enter Dashboard'}
                </Button>
              </div>
            </form>
          )}

          {/* Quick Demo Helper Shortcuts */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
              Quick 1-Click Demo Accounts:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('admin@example.com', 'Admin@123', 'admin')}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/50 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs mb-0.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>HR Admin</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">admin@example.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('sahithi@gmail.com', 'Employee@123', 'employee')}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/50 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-0.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>HR Staff</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">sahithi@gmail.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('nagamahendrareddy2004@gmail.com', 'Employee@123', 'employee')}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/50 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-0.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Dev Staff</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">nagamahendra...</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
          Protected by ASP.NET Core JWT authentication & role-based security.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
