import React, { useState, useEffect, useCallback } from 'react';
import { Clock, LogIn, LogOut, CheckCircle2, User, RefreshCw, Calendar, Sparkles } from 'lucide-react';
import { attendanceApi } from '../../api/attendanceApi';
import { employeeApi } from '../../api/employeeApi';
import type { Attendance } from '../../types/attendance';
import type { Employee } from '../../types/employee';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';

export interface QuickClockWidgetProps {
  onAttendanceChanged?: () => void;
  defaultEmployeeId?: number;
  lockEmployee?: boolean;
}

/**
 * Quick Clock-In / Clock-Out widget for rapid daily attendance tracking.
 * Features a live digital clock, instant employee selection, and one-click clock actions.
 */
export const QuickClockWidget: React.FC<QuickClockWidgetProps> = ({
  onAttendanceChanged,
  defaultEmployeeId,
  lockEmployee = false,
}) => {
  const toast = useToast();
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(defaultEmployeeId ?? null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Live digital clock timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format today's YYYY-MM-DD
  const getTodayDateString = (): string => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format current HH:mm:ss for backend TimeSpan
  const getCurrentTimeString = (): string => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // Load employee list on mount
  useEffect(() => {
    let isMounted = true;
    const fetchEmployees = async () => {
      try {
        const res = await employeeApi.getAll({ pageSize: 100, status: 'Active' });
        if (isMounted) {
          const list = res.items ?? [];
          setEmployees(list);
          if (list.length > 0 && selectedEmpId === null) {
            setSelectedEmpId(defaultEmployeeId ?? list[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load employees for clock-in widget:', err);
      }
    };
    fetchEmployees();
    return () => {
      isMounted = false;
    };
  }, [defaultEmployeeId]);

  useEffect(() => {
    if (defaultEmployeeId) {
      setSelectedEmpId(defaultEmployeeId);
    }
  }, [defaultEmployeeId]);

  // Fetch today's attendance for the selected employee
  const checkTodayStatus = useCallback(async (empId: number) => {
    setIsLoadingRecord(true);
    try {
      const todayStr = getTodayDateString();
      const records = await attendanceApi.getAll({
        employeeId: empId,
        date: todayStr,
      });

      if (records && records.length > 0) {
        setTodayAttendance(records[0]);
      } else {
        setTodayAttendance(null);
      }
    } catch (err) {
      console.error('Failed to fetch employee attendance status:', err);
      setTodayAttendance(null);
    } finally {
      setIsLoadingRecord(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEmpId) {
      checkTodayStatus(selectedEmpId);
    }
  }, [selectedEmpId, checkTodayStatus]);

  // Handle Clock In
  const handleClockIn = async () => {
    if (!selectedEmpId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const todayStr = getTodayDateString();
      const timeStr = getCurrentTimeString();

      const created = await attendanceApi.create({
        employeeId: selectedEmpId,
        date: todayStr,
        status: 'Present',
        checkInTime: timeStr,
      });

      const emp = employees.find((e) => e.id === selectedEmpId);
      const empName = emp ? `${emp.firstName} ${emp.lastName}` : 'Employee';
      toast.success(`${empName} clocked in at ${timeStr}`);

      setTodayAttendance(created);
      onAttendanceChanged?.();
    } catch (err: unknown) {
      console.error('Clock-in failed:', err);
      let msg = 'Failed to clock in. Please try again.';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
        if (axiosErr.response?.status === 409) {
          msg = 'Attendance is already recorded for this employee today.';
        } else if (axiosErr.response?.data?.message) {
          msg = axiosErr.response.data.message;
        }
      }
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Clock Out
  const handleClockOut = async () => {
    if (!todayAttendance || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const timeStr = getCurrentTimeString();
      const cleanDate = todayAttendance.date ? todayAttendance.date.split('T')[0] : getTodayDateString();

      const updated = await attendanceApi.update(todayAttendance.id, {
        date: cleanDate,
        status: todayAttendance.status,
        checkInTime: todayAttendance.checkInTime || undefined,
        checkOutTime: timeStr,
      });

      const emp = employees.find((e) => e.id === selectedEmpId);
      const empName = emp ? `${emp.firstName} ${emp.lastName}` : 'Employee';
      toast.success(`${empName} clocked out at ${timeStr}`);

      setTodayAttendance(updated);
      onAttendanceChanged?.();
    } catch (err: unknown) {
      console.error('Clock-out failed:', err);
      let msg = 'Failed to clock out. Please try again.';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        if (axiosErr.response?.data?.message) {
          msg = axiosErr.response.data.message;
        }
      }
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDate = currentTime.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const hasClockedIn = Boolean(todayAttendance?.checkInTime);
  const hasClockedOut = Boolean(todayAttendance?.checkOutTime);

  return (
    <div className="bg-gradient-to-br from-indigo-900/90 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 border border-indigo-800/40 shadow-xl relative overflow-hidden">
      {/* Background ambient decorative glow */}
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Side: Live Digital Clock & Calendar */}
        <div className="flex items-center space-x-4 sm:space-x-6">
          <div className="p-3.5 bg-indigo-600/30 border border-indigo-400/20 rounded-2xl backdrop-blur-xs flex items-center justify-center shrink-0">
            <Clock className="w-8 h-8 text-indigo-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-white">
                {formattedTime}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Sparkles className="w-3 h-3 text-indigo-300" />
                Live
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-indigo-200/80 mt-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Employee Selector & Clock Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {/* Employee Selection */}
          {lockEmployee ? (
            <div className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800/90 border border-slate-700 rounded-xl">
              <User className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-slate-200">
                {employees.find((e) => e.id === selectedEmpId)?.fullName ||
                  (employees.find((e) => e.id === selectedEmpId)
                    ? `${employees.find((e) => e.id === selectedEmpId)!.firstName} ${employees.find((e) => e.id === selectedEmpId)!.lastName}`
                    : 'Personal Clock')}
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 min-w-[220px]">
              <User className="w-4 h-4 text-indigo-300 shrink-0" />
              <select
                aria-label="Select Employee"
                value={selectedEmpId ?? ''}
                onChange={(e) => setSelectedEmpId(Number(e.target.value))}
                disabled={isSubmitting || employees.length === 0}
                className="w-full bg-slate-800/80 text-white border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              >
                {employees.length === 0 ? (
                  <option value="">No Active Employees</option>
                ) : (
                  employees.map((emp) => (
                    <option key={emp.id} value={emp.id} className="bg-slate-900 text-white">
                      {emp.fullName || `${emp.firstName} ${emp.lastName}`} (#{emp.id})
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Status Badge & Action Button */}
          <div className="flex items-center space-x-3">
            {isLoadingRecord ? (
              <div className="flex items-center space-x-2 text-xs text-indigo-200 px-3 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Checking status...</span>
              </div>
            ) : hasClockedOut ? (
              <div className="flex items-center space-x-2 px-3.5 py-2 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs sm:text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Shift Completed ({todayAttendance?.checkInTime?.substring(0, 5)} - {todayAttendance?.checkOutTime?.substring(0, 5)})</span>
              </div>
            ) : hasClockedIn ? (
              <div className="flex items-center space-x-2">
                <div className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-2 bg-indigo-950/60 border border-indigo-500/30 rounded-xl text-indigo-300 text-xs">
                  <span>In at {todayAttendance?.checkInTime?.substring(0, 5)}</span>
                </div>
                <Button
                  onClick={handleClockOut}
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  className="bg-amber-600 hover:bg-amber-500 text-white flex items-center space-x-2 text-xs sm:text-sm px-4 py-2 rounded-xl shadow-md border border-amber-400/30 transition-transform active:scale-95"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Clock Out</span>
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleClockIn}
                isLoading={isSubmitting}
                disabled={isSubmitting || !selectedEmpId}
                className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-2 text-xs sm:text-sm px-4 py-2 rounded-xl shadow-md border border-emerald-400/30 transition-transform active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>Clock In</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickClockWidget;
