import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  Clock,
  IndianRupee,
  MapPin,
  PieChart as PieChartIcon,
  RefreshCw,
  Shield,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../api/dashboardApi';
import { departmentApi } from '../../api/departmentApi';
import { employeeApi } from '../../api/employeeApi';
import { attendanceApi } from '../../api/attendanceApi';
import { leaveApi } from '../../api/leaveApi';
import type { DashboardSummary } from '../../types/dashboard';
import type { Department } from '../../types/department';
import type { Employee } from '../../types/employee';
import type { Attendance } from '../../types/attendance';
import type { LeaveSummary } from '../../types/leave';
import { Loading } from '../../components/Loading/Loading';
import { Button } from '../../components/common/Button';
import { QuickClockWidget } from '../../components/Attendance/QuickClockWidget';

// Palette for department distribution pie chart
const PIE_COLORS = [
  '#4f46e5', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#14b8a6', // Teal
];

/**
 * Formats numerical currency amounts according to Indian Rupee (INR) numbering conventions.
 * Example: 125000 -> ₹1,25,000
 */
const formatINR = (value: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Formats standard ISO or YYYY-MM-DD date strings into human-readable month & day format.
 */
const formatChartDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return dateStr;
};

/**
 * Calculates hours worked between check-in and check-out time strings.
 */
const calcHoursWorked = (inTime?: string, outTime?: string): string => {
  if (!inTime || !outTime) return '-';
  const inParts = inTime.split(':').map(Number);
  const outParts = outTime.split(':').map(Number);
  if (inParts.length < 2 || outParts.length < 2) return '-';
  const diffMinutes = outParts[0] * 60 + outParts[1] - (inParts[0] * 60 + inParts[1]);
  if (diffMinutes <= 0) return '-';
  const hrs = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs} hrs`;
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  // Admin Dashboard State
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pendingLeavesCount, setPendingLeavesCount] = useState<number>(0);
  const [todayStaffAttendance, setTodayStaffAttendance] = useState<Attendance[]>([]);

  // Employee Dashboard State
  const [myProfile, setMyProfile] = useState<Employee | null>(null);
  const [myLeaveSummary, setMyLeaveSummary] = useState<LeaveSummary | null>(null);
  const [myRecentAttendance, setMyRecentAttendance] = useState<Attendance[]>([]);

  // Common State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Admin Data
  const fetchAdminData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [summaryData, deptsData, leaveSum, todayAtt] = await Promise.all([
        dashboardApi.getSummary(),
        departmentApi.getAll().catch(() => [] as Department[]),
        leaveApi.getSummary().catch(() => null),
        attendanceApi.getAll({ date: todayStr }).catch(() => [] as Attendance[]),
      ]);

      setSummary(summaryData);
      setDepartments(deptsData);
      setTodayStaffAttendance(todayAtt || []);
      if (leaveSum) {
        setPendingLeavesCount(leaveSum.pendingRequests);
      }
    } catch (err: unknown) {
      console.error('Failed to load admin dashboard insights:', err);
      setError('Unable to load management dashboard data. Please verify backend API status.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch Employee Data
  const fetchEmployeeData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const [profileData, leaveSum] = await Promise.all([
        employeeApi.getMyProfile().catch(() => null),
        leaveApi.getSummary().catch(() => null),
      ]);

      setMyProfile(profileData);
      setMyLeaveSummary(leaveSum);

      if (profileData?.id) {
        const attendanceLogs = await attendanceApi.getAll({
          employeeId: profileData.id,
        });
        // Sort descending by date
        const sorted = (attendanceLogs || []).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setMyRecentAttendance(sorted.slice(0, 5));
      }
    } catch (err: unknown) {
      console.error('Failed to load employee dashboard data:', err);
      setError('Unable to load your employee profile. Please refresh or contact your manager.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData(false);
    } else {
      fetchEmployeeData(false);
    }
  }, [isAdmin, fetchAdminData, fetchEmployeeData]);

  if (isLoading) {
    return (
      <Loading
        message={
          isAdmin
            ? 'Loading workforce analytics & managerial KPIs...'
            : 'Loading your employee workspace & records...'
        }
      />
    );
  }

  // =========================================================================
  // EMPLOYEE SELF-SERVICE WORKPLACE DASHBOARD
  // =========================================================================
  if (!isAdmin) {
    const monthlyGross = (myProfile?.salary ?? 0) / 12;
    const hireDateFormatted = myProfile?.hireDate
      ? new Date(myProfile.hireDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'Recently Joined';

    return (
      <div className="space-y-6 pb-12">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-semibold mb-3">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Employee Self-Service Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight m-0">
                Welcome back, {myProfile ? `${myProfile.firstName} ${myProfile.lastName}` : user?.username}!
              </h1>
              <p className="text-sm text-emerald-100/80 mt-1 max-w-xl">
                Here is your staff overview for today. Clock in/out, check your salary compensation, and manage leave requests.
              </p>

              {/* Key Quick Badges */}
              <div className="flex flex-wrap items-center gap-3 mt-4 text-xs">
                <span className="flex items-center space-x-1.5 px-3 py-1 bg-white/10 rounded-xl backdrop-blur-xs">
                  <Building2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{myProfile?.departmentName || 'General Staff'}</span>
                </span>
                <span className="flex items-center space-x-1.5 px-3 py-1 bg-white/10 rounded-xl backdrop-blur-xs">
                  <Calendar className="w-3.5 h-3.5 text-teal-300" />
                  <span>Joined: {hireDateFormatted}</span>
                </span>
                <span className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 rounded-xl">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Status: {myProfile?.status || 'Active'}</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link to="/leaves?action=apply">
                <button
                  type="button"
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-950 font-black text-sm shadow-xl flex items-center justify-center space-x-2 transition-all transform hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-white/30"
                >
                  <CalendarPlus className="w-5 h-5 text-emerald-700 stroke-[2.5]" />
                  <span>+ Apply for Leave</span>
                </button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchEmployeeData(true)}
                isLoading={isRefreshing}
                disabled={isRefreshing}
                className="w-full sm:w-auto border-emerald-500/40 text-emerald-100 hover:bg-white/10"
              >
                <RefreshCw className={`w-4 h-4 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Clock-In / Clock-Out Widget Locked to This Employee */}
        {myProfile?.id && (
          <QuickClockWidget
            defaultEmployeeId={myProfile.id}
            lockEmployee={true}
            onAttendanceChanged={() => fetchEmployeeData(true)}
          />
        )}

        {/* Three Primary Cards: Compensation, Leave Balance, Staff Profile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: My Salary & Compensation */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Compensation & Payroll
                </span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <IndianRupee className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xs text-slate-500">Estimated Monthly Salary</span>
                <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  {formatINR(monthlyGross)}
                </h3>
                <p className="text-xs text-emerald-600 font-medium mt-1">
                  Annual CTC: {formatINR(myProfile?.salary ?? 0)}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Direct Bank Deposit</span>
              <span className="font-semibold text-emerald-600">Active</span>
            </div>
          </div>

          {/* Card 2: My Leave Entitlements */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Leave Entitlement
                </span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <CalendarCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xs text-slate-500">Total Available Leave Balance</span>
                <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  {(myLeaveSummary?.casualLeaveBalance ?? 12) +
                    (myLeaveSummary?.sickLeaveBalance ?? 10) +
                    (myLeaveSummary?.annualLeaveBalance ?? 15)}{' '}
                  <span className="text-base font-normal text-slate-500">Days</span>
                </h3>
                <div className="flex items-center space-x-3 text-xs text-slate-600 mt-2">
                  <span>Casual: {myLeaveSummary?.casualLeaveBalance ?? 12}d</span>
                  <span>•</span>
                  <span>Sick: {myLeaveSummary?.sickLeaveBalance ?? 10}d</span>
                  <span>•</span>
                  <span>Annual: {myLeaveSummary?.annualLeaveBalance ?? 15}d</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {myLeaveSummary?.pendingRequests ?? 0} request pending review
              </span>
              <Link
                to="/leaves"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center"
              >
                <span>View Leaves</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
          </div>

          {/* Card 3: Staff Profile & Department */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Employee Record
                </span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Shield className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Staff ID:</span>
                  <span className="font-bold text-slate-900">#{myProfile?.id ?? user?.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Assigned Department:</span>
                  <span className="font-semibold text-indigo-600">
                    {myProfile?.departmentName || 'Software Development'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-700 truncate max-w-[160px]">
                    {myProfile?.email || user?.email}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Role:</span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-semibold">
                    Employee
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
              Department & salary changes managed by HR Admin.
            </div>
          </div>
        </div>

        {/* Section: Leave Balances Detailed Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">Your Leave Quotas</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Track your allocated balances and remaining days for the current calendar year.
              </p>
            </div>
            <Link to="/leaves?action=apply">
              <button
                type="button"
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer ring-2 ring-emerald-400/30"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>+ Apply for Leave</span>
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Casual Leave</span>
                  <span className="font-bold text-slate-700">Quota: 12 days</span>
                </div>
                <div className="text-2xl font-extrabold text-slate-900">
                  {myLeaveSummary?.casualLeaveBalance ?? 12}
                  <span className="text-xs font-normal text-slate-500 ml-1.5">days left</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-3 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(0, ((myLeaveSummary?.casualLeaveBalance ?? 12) / 12) * 100))}%`,
                    }}
                  />
                </div>
              </div>
              <Link
                to="/leaves?action=apply&type=Casual"
                className="block mt-3 text-center text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 py-1.5 rounded-lg border border-indigo-200 transition-colors"
              >
                + Apply Casual Leave
              </Link>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Sick Leave</span>
                  <span className="font-bold text-slate-700">Quota: 10 days</span>
                </div>
                <div className="text-2xl font-extrabold text-slate-900">
                  {myLeaveSummary?.sickLeaveBalance ?? 10}
                  <span className="text-xs font-normal text-slate-500 ml-1.5">days left</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-3 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(0, ((myLeaveSummary?.sickLeaveBalance ?? 10) / 10) * 100))}%`,
                    }}
                  />
                </div>
              </div>
              <Link
                to="/leaves?action=apply&type=Sick"
                className="block mt-3 text-center text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 py-1.5 rounded-lg border border-emerald-200 transition-colors"
              >
                + Apply Sick Leave
              </Link>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Annual Leave</span>
                  <span className="font-bold text-slate-700">Quota: 15 days</span>
                </div>
                <div className="text-2xl font-extrabold text-slate-900">
                  {myLeaveSummary?.annualLeaveBalance ?? 15}
                  <span className="text-xs font-normal text-slate-500 ml-1.5">days left</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-3 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(0, ((myLeaveSummary?.annualLeaveBalance ?? 15) / 15) * 100))}%`,
                    }}
                  />
                </div>
              </div>
              <Link
                to="/leaves?action=apply&type=Annual"
                className="block mt-3 text-center text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 py-1.5 rounded-lg border border-amber-200 transition-colors"
              >
                + Apply Vacation Leave
              </Link>
            </div>
          </div>
        </div>

        {/* Section: Recent Attendance Log */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">Recent Attendance Punches</h3>
              <p className="text-xs text-slate-500 mt-0.5">Your most recent 5 daily check-ins and check-outs.</p>
            </div>
            <Link
              to="/attendance"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center"
            >
              <span>View Full History</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>

          {myRecentAttendance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Date</th>
                    <th className="px-6 py-3 font-semibold">Check-In</th>
                    <th className="px-6 py-3 font-semibold">Check-Out</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold">Hours Worked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myRecentAttendance.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {new Date(rec.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-mono text-xs">
                        {rec.checkInTime || '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-mono text-xs">
                        {rec.checkOutTime || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            rec.status === 'Present'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : rec.status === 'Late'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium font-mono text-xs">
                        {calcHoursWorked(rec.checkInTime, rec.checkOutTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">
              No recent attendance records found. Use the quick clock widget above to record your first punch today!
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // ADMIN / MANAGER EXECUTIVE DASHBOARD
  // =========================================================================

  // Determine if backend returned a completely empty organization state
  const isCompletelyEmpty =
    !summary ||
    (summary.totalEmployees === 0 &&
      summary.totalDepartments === 0 &&
      summary.departmentEmployeeCounts.length === 0);

  // Prepare unified department summary rows
  const departmentSummaryList =
    departments.length > 0
      ? departments.map((d) => ({
          id: d.id,
          name: d.name,
          employeeCount: d.employeeCount,
          budget: d.budget,
          location: d.location || 'Main Office',
        }))
      : (summary?.departmentBudgets ?? []).map((db) => {
          const matchedCount = summary?.departmentEmployeeCounts.find(
            (c) => c.departmentId === db.departmentId
          );
          return {
            id: db.departmentId,
            name: db.departmentName,
            employeeCount: matchedCount?.employeeCount ?? 0,
            budget: db.budget,
            location: 'Main Office',
          };
        });

  // Prepare data for Attendance Trends Chart
  const attendanceChartData = (summary?.attendanceTrends ?? []).map((t) => ({
    rawDate: t.date,
    date: formatChartDate(t.date),
    Present: t.present,
    Absent: t.absent,
    Late: t.late,
    Excused: t.excused,
    Total: t.total,
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Header with Title and Refresh Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">Executive Dashboard</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Manager Portal
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time workforce headcount, operational KPIs, salary payroll, and attendance analytics.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAdminData(true)}
            isLoading={isRefreshing}
            disabled={isRefreshing}
            className="flex items-center space-x-2 text-slate-700 hover:text-indigo-600"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </Button>
        </div>
      </div>

      {/* Error Alert with Retry button */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-sm font-medium m-0">{error}</p>
          </div>
          <Button variant="danger" size="sm" onClick={() => fetchAdminData(summary !== null)}>
            Retry
          </Button>
        </div>
      )}

      {/* Pending Leave Requests Manager Alert Banner */}
      {pendingLeavesCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 text-amber-900 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950 m-0">
                Action Required: {pendingLeavesCount} Pending Leave Request{pendingLeavesCount > 1 ? 's' : ''}
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Staff members have submitted leave requests waiting for manager review and approval.
              </p>
            </div>
          </div>
          <Link to="/leaves">
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm shrink-0">
              Review Leaves
            </Button>
          </Link>
        </div>
      )}

      {/* Today's Live Workforce Attendance Monitor (Manager / Admin View) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0">
                  Today's Staff Clock-In Monitor
                </h3>
                <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Feed</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time daily punch records submitted by staff members for {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
              {todayStaffAttendance.filter((a) => a.status === 'Present' || a.status === 'Late').length} Clocked In Today
            </div>
            <Link
              to="/attendance"
              className="inline-flex items-center space-x-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-bold"
            >
              <span>Full Register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {todayStaffAttendance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-semibold">Employee</th>
                  <th className="px-6 py-3 font-semibold">Clock In Time</th>
                  <th className="px-6 py-3 font-semibold">Clock Out Time</th>
                  <th className="px-6 py-3 font-semibold">Hours Logged</th>
                  <th className="px-6 py-3 font-semibold text-right">Duty Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {todayStaffAttendance.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {rec.employeeName || `Employee #${rec.employeeId}`}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        {rec.employeeEmail || `ID: ${rec.employeeId}`}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {rec.checkInTime || '—'}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {rec.checkOutTime ? (
                        rec.checkOutTime
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-sans text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Currently On Duty</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {calcHoursWorked(rec.checkInTime, rec.checkOutTime)}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          rec.status === 'Present'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : rec.status === 'Late'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
            <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-600 dark:text-slate-400">No employee punches recorded yet today.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              As staff members punch in from their employee portal, their live attendance will appear here automatically.
            </p>
          </div>
        )}
      </div>

      {/* Primary KPI Cards Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Employees */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Employees
            </span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
              {summary?.totalEmployees ?? 0}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Registered staff members</p>
          </div>
        </div>

        {/* Active Staff */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Employees
            </span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
              {summary?.activeEmployees ?? 0}
            </h3>
            <p className="text-xs text-emerald-600 font-medium mt-1">Currently on active duty</p>
          </div>
        </div>

        {/* On Leave */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Employees On Leave
            </span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
              {summary?.onLeaveEmployees ?? 0}
            </h3>
            <p className="text-xs text-amber-600 font-medium mt-1">Approved temporary leaves</p>
          </div>
        </div>

        {/* Terminated */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Terminated Employees
            </span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
              {summary?.terminatedEmployees ?? 0}
            </h3>
            <p className="text-xs text-rose-500 font-medium mt-1">Archived / offboarded</p>
          </div>
        </div>
      </div>

      {/* Secondary KPI Cards Grid (3 Cards: Total Departments, Monthly Payroll, Average Attendance) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {/* Total Departments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Departments
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              {summary?.totalDepartments ?? 0}
            </h3>
            <p className="text-xs text-slate-400 truncate mt-0.5">Organizational units</p>
          </div>
        </div>

        {/* Monthly Payroll */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Monthly Payroll
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5 truncate">
              {formatINR(summary?.monthlyPayroll ?? 0)}
            </h3>
            <p className="text-xs text-slate-400 truncate mt-0.5">Estimated active salary / month</p>
          </div>
        </div>

        {/* Average Attendance Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-center space-x-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Average Attendance
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              {summary?.averageAttendanceRate ?? 0}%
            </h3>
            <p className="text-xs text-slate-400 truncate mt-0.5">Overall presence percentage</p>
          </div>
        </div>
      </div>

      {/* Empty State Banner if no workforce data exists */}
      {isCompletelyEmpty && !error && (
        <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No Analytics Data Available</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            There are currently no employees or departments recorded in the system. Populate or seed
            the database to view visual trends and distribution metrics.
          </p>
        </div>
      )}

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section A: Department Distribution (PieChart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <PieChartIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 m-0">Department Distribution</h3>
                <p className="text-xs text-slate-500 mt-0.5">Employee headcount by department</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              {summary?.departmentEmployeeCounts.length ?? 0} Departments
            </span>
          </div>

          {(summary?.departmentEmployeeCounts ?? []).length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary?.departmentEmployeeCounts}
                    dataKey="employeeCount"
                    nameKey="departmentName"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {summary?.departmentEmployeeCounts.map((_, index) => (
                      <Cell
                        key={`dept-cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: unknown) => [`${val ?? 0} Employees`, 'Headcount']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '0.75rem',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.813rem',
                    }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
              No department headcount data available.
            </div>
          )}
        </div>

        {/* Section B: Monthly Hiring Trends (BarChart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 m-0">Monthly Hiring Trends</h3>
                <p className="text-xs text-slate-500 mt-0.5">New hires over the trailing 12 months</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Trailing 12 Mo
            </span>
          </div>

          {(summary?.monthlyHiringTrends ?? []).length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={summary?.monthlyHiringTrends}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip
                    formatter={(val: unknown) => [`${val ?? 0} Hired`, 'Onboarded']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '0.75rem',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.813rem',
                    }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Bar
                    dataKey="hiredCount"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
              No historical hiring records found.
            </div>
          )}
        </div>
      </div>

      {/* Section C: Attendance Trends (LineChart over trailing 14 days) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">Daily Attendance Trends</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Attendance breakdown across Present, Absent, Late, and Excused (Past 14 Days)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600">Present</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-slate-600">Late</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              <span className="text-slate-600">Excused</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="text-slate-600">Absent</span>
            </span>
          </div>
        </div>

        {attendanceChartData.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={attendanceChartData}
                margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '0.75rem',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.813rem',
                  }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }}
                />
                <Line
                  type="monotone"
                  dataKey="Present"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Late"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="Excused"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="Absent"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-slate-400 text-sm">
            No attendance activity recorded for the past 14 days.
          </div>
        )}
      </div>

      {/* Section 5: Department Summary Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0">Department Summary</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Overview of department allocation, staffing levels, and assigned budgets.
            </p>
          </div>
          <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
            {departmentSummaryList.length} Units Listed
          </span>
        </div>

        {departmentSummaryList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-semibold">Department Name</th>
                  <th className="px-6 py-3 font-semibold text-center">Employee Count</th>
                  <th className="px-6 py-3 font-semibold text-right">Budget Allocated</th>
                  <th className="px-6 py-3 font-semibold">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departmentSummaryList.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 flex items-center space-x-2.5">
                      <div className="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></div>
                      <span>{dept.name}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {dept.employeeCount} {dept.employeeCount === 1 ? 'member' : 'members'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-800">
                      {formatINR(dept.budget)}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{dept.location}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-sm">
            No departments defined yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
