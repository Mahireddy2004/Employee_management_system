import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Building2,
  CalendarCheck,
  IndianRupee,
  MapPin,
  PieChart as PieChartIcon,
  RefreshCw,
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
import { dashboardApi } from '../../api/dashboardApi';
import { departmentApi } from '../../api/departmentApi';
import type { DashboardSummary } from '../../types/dashboard';
import type { Department } from '../../types/department';
import { Loading } from '../../components/Loading/Loading';
import { Button } from '../../components/common/Button';

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
 * Example: "2026-09-07" -> "Sep 7"
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

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const [summaryData, deptsData] = await Promise.all([
        dashboardApi.getSummary(),
        departmentApi.getAll().catch((deptErr) => {
          console.warn('Could not fetch detailed department list for locations:', deptErr);
          return [] as Department[];
        }),
      ]);

      setSummary(summaryData);
      setDepartments(deptsData);
    } catch (err: unknown) {
      console.error('Failed to load dashboard insights:', err);
      setError(
        'Unable to load dashboard data. Please verify that the backend API is running and that your session is active.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  if (isLoading) {
    return <Loading message="Loading workforce analytics & KPI metrics..." />;
  }

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time workforce headcount, operational KPIs, and attendance analytics.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(true)}
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
          <Button variant="danger" size="sm" onClick={() => fetchDashboardData(summary !== null)}>
            Retry
          </Button>
        </div>
      )}

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
