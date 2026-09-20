import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { attendanceApi } from '../../api/attendanceApi';
import { employeeApi } from '../../api/employeeApi';
import type {
  Attendance,
  AttendanceQueryParams,
  AttendanceStatus,
  CreateAttendanceRequest,
  UpdateAttendanceRequest,
} from '../../types/attendance';
import type { Employee } from '../../types/employee';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/Loading/Loading';

/**
 * Formats date strings (e.g. "2026-09-20T00:00:00" or "2026-09-20")
 * into a professional format like "20 Sep 2026" without timezone drift.
 */
const formatDateDisplay = (dateString?: string): string => {
  if (!dateString) return '—';
  const cleanDate = dateString.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length !== 3) return dateString;
  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day) return dateString;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Formats time strings (e.g. "09:30:00" or "09:30") into a user-friendly format like "09:30 AM".
 * Returns "—" if undefined, empty, or null.
 */
const formatTimeDisplay = (timeString?: string): string => {
  if (!timeString || !timeString.trim()) return '—';
  const parts = timeString.trim().split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (isNaN(hours)) return '—';
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${String(formattedHours).padStart(2, '0')}:${minutes} ${ampm}`;
  }
  return timeString;
};

/**
 * Extracts "HH:mm" from time strings for HTML <input type="time" /> fields.
 */
const toInputTime = (timeString?: string): string => {
  if (!timeString || !timeString.trim()) return '';
  const parts = timeString.trim().split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return '';
};

/**
 * Normalizes "HH:mm" input time to "HH:mm:ss" for backend TimeSpan deserialization.
 */
const toPayloadTime = (timeString?: string): string | undefined => {
  if (!timeString || !timeString.trim()) return undefined;
  const trimmed = timeString.trim();
  if (trimmed.length === 5) {
    return `${trimmed}:00`;
  }
  return trimmed;
};

/**
 * Returns consistent badge styles matching the application design system.
 */
const getStatusBadgeClass = (status: AttendanceStatus | string): string => {
  switch (status) {
    case 'Present':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Late':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Absent':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Excused':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const PAGE_SIZE = 10;

export const AttendancePage: React.FC = () => {
  // Data states
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Filter states
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Client-side pagination
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal (Add / Edit) states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formData, setFormData] = useState<{
    employeeId: string;
    date: string;
    status: AttendanceStatus;
    checkInTime: string;
    checkOutTime: string;
  }>({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Present',
    checkInTime: '09:00',
    checkOutTime: '17:00',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Attendance | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Load employees for employee filter dropdown and modal selection
  const loadEmployees = useCallback(async () => {
    try {
      const response = await employeeApi.getAll({ pageSize: 100 });
      setEmployees(response.items);
    } catch (err: unknown) {
      console.error('Failed to load employee list:', err);
    }
  }, []);

  // Fetch attendance records from backend API
  const loadAttendance = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const params: AttendanceQueryParams = {};
      if (filterEmployeeId) {
        const empId = parseInt(filterEmployeeId, 10);
        if (!isNaN(empId) && empId > 0) {
          params.employeeId = empId;
        }
      }
      if (filterDate.trim()) {
        params.date = filterDate.trim();
      }
      if (filterStatus.trim()) {
        params.status = filterStatus.trim();
      }

      const data = await attendanceApi.getAll(params);
      setAttendances(data);
    } catch (err: unknown) {
      console.error('Failed to load attendance logs:', err);
      setApiError(
        'Unable to load attendance records. Please verify that the backend API is running and reachable.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [filterEmployeeId, filterDate, filterStatus]);

  // Initial load
  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // Whenever filters change, reset pagination
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDate, filterEmployeeId, filterStatus]);

  // Check if any filter is actively applied
  const isFilterActive = Boolean(filterDate || filterEmployeeId || filterStatus);

  // Clear all filters
  const handleClearFilters = () => {
    setFilterDate('');
    setFilterEmployeeId('');
    setFilterStatus('');
  };

  // Open Create Attendance modal
  const handleOpenCreateModal = () => {
    setEditingRecord(null);
    setFormData({
      employeeId: employees.length > 0 ? String(employees[0].id) : '',
      date: new Date().toISOString().split('T')[0],
      status: 'Present',
      checkInTime: '09:00',
      checkOutTime: '17:00',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Attendance modal
  const handleOpenEditModal = (att: Attendance) => {
    setEditingRecord(att);
    setFormData({
      employeeId: String(att.employeeId),
      date: att.date.split('T')[0],
      status: att.status,
      checkInTime: toInputTime(att.checkInTime),
      checkOutTime: toInputTime(att.checkOutTime),
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editingRecord && (!formData.employeeId || parseInt(formData.employeeId, 10) <= 0)) {
      errors.employeeId = 'Please select an employee.';
    }

    if (!formData.date.trim()) {
      errors.date = 'Attendance date is required.';
    }

    if (!formData.status) {
      errors.status = 'Attendance status is required.';
    }

    // Validate times if not Absent
    if (formData.status !== 'Absent') {
      const { checkInTime, checkOutTime } = formData;
      if (checkInTime && checkOutTime) {
        if (checkOutTime < checkInTime) {
          errors.checkOutTime = 'Check-out time cannot be earlier than check-in time.';
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Form Submission (Add or Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      if (editingRecord) {
        // Edit mode: PUT /api/attendance/{id}
        const payload: UpdateAttendanceRequest = {
          date: formData.date,
          status: formData.status,
          checkInTime:
            formData.status === 'Absent' ? undefined : toPayloadTime(formData.checkInTime),
          checkOutTime:
            formData.status === 'Absent' ? undefined : toPayloadTime(formData.checkOutTime),
        };

        await attendanceApi.update(editingRecord.id, payload);
        setFeedback({
          type: 'success',
          message: `Attendance entry updated for ${editingRecord.employeeName || 'employee'} on ${formatDateDisplay(formData.date)}.`,
        });
      } else {
        // Create mode: POST /api/attendance
        const payload: CreateAttendanceRequest = {
          employeeId: parseInt(formData.employeeId, 10),
          date: formData.date,
          status: formData.status,
          checkInTime:
            formData.status === 'Absent' ? undefined : toPayloadTime(formData.checkInTime),
          checkOutTime:
            formData.status === 'Absent' ? undefined : toPayloadTime(formData.checkOutTime),
        };

        await attendanceApi.create(payload);
        const selectedEmp = employees.find((e) => e.id === payload.employeeId);
        const empName = selectedEmp
          ? `${selectedEmp.firstName} ${selectedEmp.lastName}`
          : `Employee #${payload.employeeId}`;

        setFeedback({
          type: 'success',
          message: `Attendance logged successfully for ${empName} on ${formatDateDisplay(formData.date)}.`,
        });
      }

      setIsModalOpen(false);
      loadAttendance();
    } catch (err: unknown) {
      console.error('Failed to save attendance record:', err);
      let errorMsg = 'Failed to save attendance details. Please check your inputs and try again.';

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response?: { status?: number; data?: { message?: string } };
        };
        // 409 Conflict: Duplicate attendance entry
        if (axiosErr.response?.status === 409) {
          errorMsg = 'Attendance already exists for this employee on this date.';
        } else if (axiosErr.response?.data?.message) {
          errorMsg = axiosErr.response.data.message;
        }
      }

      setFeedback({ type: 'error', message: errorMsg });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;

    setIsDeleting(true);
    try {
      await attendanceApi.delete(deleteTarget.id);
      setFeedback({
        type: 'success',
        message: `Attendance record for ${deleteTarget.employeeName || 'employee'} on ${formatDateDisplay(deleteTarget.date)} deleted successfully.`,
      });
      setDeleteTarget(null);
      loadAttendance();
    } catch (err: unknown) {
      console.error('Failed to delete attendance record:', err);
      let errorMsg = 'Unable to delete attendance record. Please try again.';

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response?: { data?: { message?: string } };
        };
        if (axiosErr.response?.data?.message) {
          errorMsg = axiosErr.response.data.message;
        }
      }

      setFeedback({ type: 'error', message: errorMsg });
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Computed summary metrics
  const totalCount = attendances.length;
  const presentCount = attendances.filter((a) => a.status === 'Present').length;
  const lateCount = attendances.filter((a) => a.status === 'Late').length;
  const absentCount = attendances.filter((a) => a.status === 'Absent').length;

  // Client-side pagination calculations
  const totalPages = Math.max(1, Math.ceil(attendances.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedAttendances = useMemo(() => {
    return attendances.slice(startIndex, startIndex + PAGE_SIZE);
  }, [attendances, startIndex]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">
            Attendance Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track daily employee attendance, punctuality timestamps, and absence logs.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleOpenCreateModal}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Attendance</span>
          </Button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-xl flex items-center justify-between shadow-xs transition-all animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center space-x-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* API Error State */}
      {apiError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm font-medium m-0">{apiError}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAttendance}
            className="flex items-center space-x-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </Button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Logs
            </p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{totalCount}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Present</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{presentCount}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Late</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{lateCount}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Absent</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{absentCount}</h3>
          </div>
        </div>
      </div>

      {/* Filter Control Strip */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filter */}
          <div className="flex items-center space-x-2">
            <label htmlFor="filter-date" className="text-xs font-medium text-slate-500 whitespace-nowrap">
              Date:
            </label>
            <div className="relative">
              <input
                id="filter-date"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
              />
            </div>
          </div>

          {/* Employee Filter */}
          <div className="flex items-center space-x-2">
            <label htmlFor="filter-employee" className="text-xs font-medium text-slate-500 whitespace-nowrap">
              Employee:
            </label>
            <select
              id="filter-employee"
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 max-w-xs"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} (#{emp.id})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <label htmlFor="filter-status" className="text-xs font-medium text-slate-500 whitespace-nowrap">
              Status:
            </label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
              <option value="Excused">Excused</option>
            </select>
          </div>

          {/* Clear Filters Action */}
          {isFilterActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="flex items-center space-x-1 text-slate-600 hover:text-slate-900"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </Button>
          )}
        </div>

        <div className="text-xs font-medium text-slate-500 self-end md:self-center">
          Showing {attendances.length === 0 ? 0 : startIndex + 1}–
          {Math.min(startIndex + PAGE_SIZE, attendances.length)} of {attendances.length} records
        </div>
      </div>

      {/* Attendance Table / Content */}
      {isLoading ? (
        <Loading message="Loading attendance records..." />
      ) : attendances.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">
            {isFilterActive ? 'No matching attendance records' : 'No attendance entries found'}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
            {isFilterActive
              ? 'No attendance entries match your active filters. Try clearing or relaxing your filter parameters.'
              : 'Log your first daily employee attendance record to begin tracking.'}
          </p>
          <div className="mt-5">
            {isFilterActive ? (
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            ) : (
              <Button onClick={handleOpenCreateModal} size="sm">
                Add Attendance
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-slate-700 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">ID</th>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Check-In</th>
                  <th className="px-6 py-3.5">Check-Out</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedAttendances.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/75 transition-colors">
                    {/* ID */}
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-500">
                      #{att.id}
                    </td>

                    {/* Employee */}
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                          {att.employeeName
                            ? att.employeeName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)
                            : `E${att.employeeId}`}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {att.employeeName || `Employee #${att.employeeId}`}
                          </div>
                          {att.employeeEmail && (
                            <div className="text-xs text-slate-400">{att.employeeEmail}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-slate-700 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDateDisplay(att.date)}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass(
                          att.status
                        )}`}
                      >
                        {att.status}
                      </span>
                    </td>

                    {/* Check-In */}
                    <td className="px-6 py-4 text-slate-700 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-xs">{formatTimeDisplay(att.checkInTime)}</span>
                      </div>
                    </td>

                    {/* Check-Out */}
                    <td className="px-6 py-4 text-slate-700 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-xs">{formatTimeDisplay(att.checkOutTime)}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(att)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          aria-label={`Edit attendance record #${att.id}`}
                          title="Edit record"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(att)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          aria-label={`Delete attendance record #${att.id}`}
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer & Pagination */}
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Page <span className="font-semibold text-slate-700">{currentPage}</span> of{' '}
              <span className="font-semibold text-slate-700">{totalPages}</span>
            </span>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="flex items-center space-x-1"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>

              {/* Numerical Page Indicators */}
              <div className="hidden sm:flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((pageNum, idx, arr) => (
                    <React.Fragment key={pageNum}>
                      {idx > 0 && arr[idx - 1] !== pageNum - 1 && (
                        <span className="px-1 text-slate-400 text-xs">…</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 text-xs font-medium rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-200/70'
                        }`}
                      >
                        {pageNum}
                      </button>
                    </React.Fragment>
                  ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="flex items-center space-x-1"
                aria-label="Next Page"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Add / Edit Attendance Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="attendance-modal-title"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 id="attendance-modal-title" className="text-lg font-bold text-slate-900 m-0">
                  {editingRecord ? 'Edit Attendance Record' : 'Add Attendance Entry'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingRecord
                    ? 'Modify attendance status, check-in, or check-out times.'
                    : 'Log staff attendance timestamp and status for the chosen workday.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isSaving && setIsModalOpen(false)}
                disabled={isSaving}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} noValidate className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Employee Selection */}
              <div>
                <label
                  htmlFor="att-employee"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Employee <span className="text-rose-500">*</span>
                </label>
                {editingRecord ? (
                  <div className="px-3.5 py-2 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-700 flex items-center space-x-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>
                      {editingRecord.employeeName || `Employee #${editingRecord.employeeId}`}
                    </span>
                  </div>
                ) : (
                  <select
                    id="att-employee"
                    value={formData.employeeId}
                    onChange={(e) => {
                      setFormData({ ...formData, employeeId: e.target.value });
                      if (formErrors.employeeId) setFormErrors({ ...formErrors, employeeId: '' });
                    }}
                    className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 ${
                      formErrors.employeeId
                        ? 'border-rose-300 text-rose-900 focus:ring-rose-500'
                        : 'border-slate-200 text-slate-900 focus:ring-indigo-500'
                    }`}
                  >
                    <option value="">Select Employee...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.email})
                      </option>
                    ))}
                  </select>
                )}
                {formErrors.employeeId && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.employeeId}</p>
                )}
              </div>

              {/* Date */}
              <div>
                <label
                  htmlFor="att-date"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl">
                  <input
                    id="att-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => {
                      setFormData({ ...formData, date: e.target.value });
                      if (formErrors.date) setFormErrors({ ...formErrors, date: '' });
                    }}
                    className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 ${
                      formErrors.date
                        ? 'border-rose-300 text-rose-900 focus:ring-rose-500'
                        : 'border-slate-200 text-slate-900 focus:ring-indigo-500'
                    }`}
                  />
                </div>
                {formErrors.date && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.date}</p>
                )}
              </div>

              {/* Attendance Status */}
              <div>
                <label
                  htmlFor="att-status"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Status <span className="text-rose-500">*</span>
                </label>
                <select
                  id="att-status"
                  value={formData.status}
                  onChange={(e) => {
                    const newStatus = e.target.value as AttendanceStatus;
                    setFormData({
                      ...formData,
                      status: newStatus,
                      ...(newStatus === 'Absent' ? { checkInTime: '', checkOutTime: '' } : {}),
                    });
                    if (formErrors.status) setFormErrors({ ...formErrors, status: '' });
                    if (formErrors.checkOutTime) setFormErrors({ ...formErrors, checkOutTime: '' });
                  }}
                  className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 ${
                    formErrors.status
                      ? 'border-rose-300 text-rose-900 focus:ring-rose-500'
                      : 'border-slate-200 text-slate-900 focus:ring-indigo-500'
                  }`}
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="Excused">Excused</option>
                </select>
                {formErrors.status && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.status}</p>
                )}
              </div>

              {/* Check-In & Check-Out Times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Check-In Time */}
                <div>
                  <label
                    htmlFor="att-checkin"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Check-In Time{' '}
                    {formData.status === 'Absent' ? (
                      <span className="text-slate-400 font-normal">(Optional)</span>
                    ) : null}
                  </label>
                  <div className="relative rounded-xl">
                    <input
                      id="att-checkin"
                      type="time"
                      value={formData.checkInTime}
                      disabled={formData.status === 'Absent'}
                      onChange={(e) => {
                        setFormData({ ...formData, checkInTime: e.target.value });
                        if (formErrors.checkOutTime) setFormErrors({ ...formErrors, checkOutTime: '' });
                      }}
                      className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:text-slate-400 ${
                        formErrors.checkInTime
                          ? 'border-rose-300 text-rose-900 focus:ring-rose-500'
                          : 'border-slate-200 text-slate-900 focus:ring-indigo-500'
                      }`}
                    />
                  </div>
                  {formErrors.checkInTime && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.checkInTime}</p>
                  )}
                </div>

                {/* Check-Out Time */}
                <div>
                  <label
                    htmlFor="att-checkout"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Check-Out Time{' '}
                    {formData.status === 'Absent' ? (
                      <span className="text-slate-400 font-normal">(Optional)</span>
                    ) : null}
                  </label>
                  <div className="relative rounded-xl">
                    <input
                      id="att-checkout"
                      type="time"
                      value={formData.checkOutTime}
                      disabled={formData.status === 'Absent'}
                      onChange={(e) => {
                        setFormData({ ...formData, checkOutTime: e.target.value });
                        if (formErrors.checkOutTime) setFormErrors({ ...formErrors, checkOutTime: '' });
                      }}
                      className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:text-slate-400 ${
                        formErrors.checkOutTime
                          ? 'border-rose-300 text-rose-900 focus:ring-rose-500'
                          : 'border-slate-200 text-slate-900 focus:ring-indigo-500'
                      }`}
                    />
                  </div>
                  {formErrors.checkOutTime && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.checkOutTime}</p>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isSaving ? 'Saving...' : editingRecord ? 'Update Record' : 'Save Attendance'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-attendance-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center space-x-3.5 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 id="delete-attendance-title" className="text-lg font-bold text-slate-900 m-0">
                  Delete Attendance Record
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Confirm record deletion</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete the attendance entry for{' '}
              <strong className="text-slate-900 font-semibold">
                {deleteTarget.employeeName || `Employee #${deleteTarget.employeeId}`}
              </strong>{' '}
              on{' '}
              <strong className="text-slate-900 font-semibold">
                {formatDateDisplay(deleteTarget.date)}
              </strong>
              ?
            </p>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Record ID:</span>
                <span className="font-mono font-semibold text-slate-800">#{deleteTarget.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadgeClass(
                    deleteTarget.status
                  )}`}
                >
                  {deleteTarget.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamps:</span>
                <span className="font-mono text-slate-800">
                  {formatTimeDisplay(deleteTarget.checkInTime)} – {formatTimeDisplay(deleteTarget.checkOutTime)}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => !isDeleting && setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                isLoading={isDeleting}
                onClick={handleConfirmDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
