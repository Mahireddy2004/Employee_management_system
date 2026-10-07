import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar,
  CalendarCheck2,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
  XCircle,
} from 'lucide-react';
import { leaveApi } from '../../api/leaveApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type {
  LeaveRequest,
  LeaveStatus,
  LeaveSummary,
  LeaveType,
} from '../../types/leave';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/Loading/Loading';

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '—';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getStatusBadgeClass = (status: LeaveStatus | string): string => {
  switch (status) {
    case 'Approved':
      return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    case 'Pending':
      return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 animate-pulse';
    case 'Rejected':
      return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    default:
      return 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  }
};

const getLeaveTypeBadgeClass = (type: LeaveType | string): string => {
  switch (type) {
    case 'Sick':
      return 'bg-rose-100/70 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300';
    case 'Casual':
      return 'bg-blue-100/70 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
    case 'Annual':
      return 'bg-purple-100/70 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  }
};

export const LeavesPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'Admin';

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [summary, setSummary] = useState<LeaveSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchParams, setSearchParams] = useSearchParams();

  // Auto-open modal if directed with ?action=apply (Employees only)
  useEffect(() => {
    if (!isAdmin && searchParams.get('action') === 'apply') {
      const type = searchParams.get('type') || 'Casual';
      setApplyForm((prev) => ({ ...prev, leaveType: type }));
      setIsApplyModalOpen(true);
      searchParams.delete('action');
      searchParams.delete('type');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, isAdmin]);

  // Modal: Apply Leave (Employee)
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [applyForm, setApplyForm] = useState<{
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
  }>({
    leaveType: 'Casual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  // Modal: Review/Reject (Admin)
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState<string>('');
  const [isReviewing, setIsReviewing] = useState<boolean>(false);

  const fetchLeaves = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [list, sum] = await Promise.all([
        leaveApi.getAll(),
        leaveApi.getSummary(),
      ]);
      setLeaves(list);
      setSummary(sum);
    } catch (err) {
      console.error('Failed to load leaves:', err);
      toast.error('Unable to fetch leave records. Please check your connection.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLeaves(false);
  }, [fetchLeaves]);

  // Handle Apply Form Submit
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyForm.startDate || !applyForm.endDate || !applyForm.reason.trim()) {
      toast.warning('Please fill in start date, end date, and reason.');
      return;
    }

    if (applyForm.endDate < applyForm.startDate) {
      toast.warning('End date cannot be earlier than start date.');
      return;
    }

    setIsSubmitting(true);
    try {
      await leaveApi.create({
        leaveType: applyForm.leaveType,
        startDate: applyForm.startDate,
        endDate: applyForm.endDate,
        reason: applyForm.reason.trim(),
      });
      toast.success('Leave application submitted successfully. Awaiting Manager approval.');
      setIsApplyModalOpen(false);
      setApplyForm({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' });
      fetchLeaves(true);
    } catch (err: unknown) {
      console.error('Failed to submit leave:', err);
      let msg = 'Failed to submit leave application.';
      if (err && typeof err === 'object' && 'response' in err) {
        const ax = err as { response?: { data?: { message?: string } } };
        if (ax.response?.data?.message) msg = ax.response.data.message;
      }
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Admin Quick Approval
  const handleApprove = async (leave: LeaveRequest) => {
    setIsReviewing(true);
    try {
      await leaveApi.updateStatus(leave.id, {
        status: 'Approved',
        adminNotes: 'Approved by Manager.',
      });
      toast.success(`Leave request for ${leave.employeeName} approved.`);
      fetchLeaves(true);
    } catch (err) {
      toast.error('Failed to approve leave request.');
    } finally {
      setIsReviewing(false);
    }
  };

  // Handle Admin Rejection Submit
  const handleConfirmReject = async () => {
    if (!rejectTarget || isReviewing) return;
    setIsReviewing(true);
    try {
      await leaveApi.updateStatus(rejectTarget.id, {
        status: 'Rejected',
        adminNotes: rejectNotes.trim() || 'Request rejected by Manager.',
      });
      toast.info(`Leave request for ${rejectTarget.employeeName} rejected.`);
      setRejectTarget(null);
      setRejectNotes('');
      fetchLeaves(true);
    } catch (err) {
      toast.error('Failed to reject leave request.');
    } finally {
      setIsReviewing(false);
    }
  };

  // Filter leaves
  const filteredLeaves = leaves.filter((l) => {
    const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
    if (!matchesStatus) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.employeeName.toLowerCase().includes(q) ||
      l.leaveType.toLowerCase().includes(q) ||
      l.reason.toLowerCase().includes(q) ||
      l.departmentName.toLowerCase().includes(q)
    );
  });

  // Calculate duration helper for modal
  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = (e.getTime() - s.getTime()) / (1000 * 3600 * 24) + 1;
    return Math.max(0, Math.round(diff));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 m-0">
              Leave Management
            </h1>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                isAdmin
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              }`}
            >
              {isAdmin ? 'Manager Approval Board' : 'Employee Self-Service'}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin
              ? 'Review, approve, and track employee leave requests, sickness logs, and vacations.'
              : 'Apply for paid time off, monitor approval statuses, and track remaining leave balances.'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLeaves(true)}
            isLoading={isRefreshing}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          {/* High-Visibility Header Apply Button (Employees only) */}
          {!isAdmin && (
            <button
              type="button"
              onClick={() => {
                setApplyForm({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' });
                setIsApplyModalOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer ring-2 ring-emerald-400/40"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Apply for Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* Prominent Hero Action Card for "Apply for Leave" (Employees only) */}
      {!isAdmin && (
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-indigo-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden border border-emerald-400/30">
          <div className="absolute right-0 top-0 -mt-6 -mr-6 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start space-x-4">
              <div className="p-3.5 bg-white/20 rounded-2xl border border-white/30 shadow-inner shrink-0 text-white">
                <CalendarPlus className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white m-0">
                    Apply for Leave / Time Off
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-white text-emerald-800 shadow-xs">
                    Request Time Off
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-50 mt-1.5 max-w-2xl leading-relaxed">
                  Need days off for illness, personal emergency, or vacation? Submit your request here. Your manager will be notified immediately for approval.
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  setApplyForm({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' });
                  setIsApplyModalOpen(true);
                }}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-950 font-black text-sm sm:text-base shadow-2xl flex items-center justify-center space-x-2.5 transition-all transform hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-white/40"
              >
                <Plus className="w-5 h-5 text-emerald-700 stroke-[3]" />
                <span>+ Apply for Leave Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      {isAdmin ? (
        /* Admin KPI Overview */
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Pending Approvals
              </span>
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
              {summary?.pendingRequests ?? 0}
            </h3>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
              Requires manager decision
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Approved Leaves
              </span>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
              {summary?.approvedRequests ?? 0}
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              Granted staff leaves
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Rejected Requests
              </span>
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
              {summary?.rejectedRequests ?? 0}
            </h3>
            <p className="text-xs text-rose-500 font-medium mt-1">Declined applications</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Requests
              </span>
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <CalendarDays className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
              {summary?.totalRequests ?? 0}
            </h3>
            <p className="text-xs text-slate-400 mt-1">All historical filings</p>
          </div>
        </div>
      ) : (
        /* Employee Personal Leave Balance Overview */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Casual Leaves Available
                </span>
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
                  <CalendarCheck2 className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                {summary?.casualLeaveBalance ?? 12} <span className="text-sm font-normal text-slate-400">/ 12 Days</span>
              </h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                Personal & emergency allowance
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setApplyForm({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' });
                setIsApplyModalOpen(true);
              }}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-800 flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Apply Casual Leave</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Sick Leaves Available
                </span>
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                {summary?.sickLeaveBalance ?? 10} <span className="text-sm font-normal text-slate-400">/ 10 Days</span>
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1">
                Medical recuperation
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setApplyForm({ leaveType: 'Sick', startDate: '', endDate: '', reason: '' });
                setIsApplyModalOpen(true);
              }}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800 flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Apply Sick Leave</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Annual Vacation Days
                </span>
                <div className="p-2.5 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                {summary?.annualLeaveBalance ?? 15} <span className="text-sm font-normal text-slate-400">/ 15 Days</span>
              </h3>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
                Paid annual vacation
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setApplyForm({ leaveType: 'Annual', startDate: '', endDate: '', reason: '' });
                setIsApplyModalOpen(true);
              }}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800 flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Apply Vacation Leave</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by employee name, reason, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 self-end sm:self-center overflow-x-auto">
          {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <Loading message="Loading leave applications..." />
      ) : filteredLeaves.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
          <CalendarDays className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            No leave requests found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            {searchQuery || statusFilter !== 'All'
              ? 'No requests match your current filters. Try resetting search parameters.'
              : 'There are currently no active or historical leave applications.'}
          </p>
          <div className="mt-5">
            {!isAdmin && (
              <Button onClick={() => setIsApplyModalOpen(true)} size="sm">
                Apply for Leave
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Employee</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Duration & Dates</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Status</th>
                  {isAdmin && <th className="py-3.5 px-4 text-right">Review Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLeaves.map((leave) => {
                  const initial = leave.employeeName ? leave.employeeName.charAt(0).toUpperCase() : 'E';

                  return (
                    <tr
                      key={leave.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Employee Info */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0 select-none">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate">
                              {leave.employeeName}
                            </span>
                            <span className="text-xs text-slate-400 block truncate">
                              {leave.departmentName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Leave Type */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${getLeaveTypeBadgeClass(
                            leave.leaveType
                          )}`}
                        >
                          {leave.leaveType}
                        </span>
                      </td>

                      {/* Dates */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                        </div>
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {leave.totalDays} {leave.totalDays === 1 ? 'Day' : 'Days'}
                        </span>
                      </td>

                      {/* Reason & Admin Feedback */}
                      <td className="py-4 px-4 max-w-xs">
                        <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 m-0">
                          {leave.reason}
                        </p>
                        {leave.adminNotes && (
                          <p className="text-[11px] text-slate-400 italic mt-1 m-0">
                            Note: {leave.adminNotes}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClass(
                            leave.status
                          )}`}
                        >
                          {leave.status}
                        </span>
                      </td>

                      {/* Actions (Manager only) */}
                      {isAdmin && (
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          {leave.status === 'Pending' ? (
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(leave)}
                                disabled={isReviewing}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-1 text-xs py-1 px-2.5 rounded-lg shadow-2xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setRejectTarget(leave);
                                  setRejectNotes('');
                                }}
                                disabled={isReviewing}
                                className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center space-x-1 text-xs py-1 px-2.5 rounded-lg"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Processed
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================== APPLY FOR LEAVE MODAL (Employees Only) =================== */}
      {!isAdmin && isApplyModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-fadeIn">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
                  Apply for Time Off / Leave
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Submit a leave request for Manager review.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="mt-4 space-y-4">
              {/* Leave Type */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Leave Category <span className="text-rose-500">*</span>
                </label>
                <select
                  aria-label="Select Leave Category"
                  value={applyForm.leaveType}
                  onChange={(e) => setApplyForm({ ...applyForm, leaveType: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Casual">Casual Leave (Personal / Family)</option>
                  <option value="Sick">Sick Leave (Medical / Recuperation)</option>
                  <option value="Annual">Annual Paid Vacation</option>
                  <option value="Maternity/Paternity">Maternity / Paternity Leave</option>
                  <option value="Unpaid">Unpaid Sabbatical</option>
                </select>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={applyForm.startDate}
                    onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={applyForm.endDate}
                    onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Duration Preview */}
              {applyForm.startDate && applyForm.endDate && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-800 dark:text-indigo-300 flex items-center justify-between">
                  <span>Calculated Duration:</span>
                  <span className="font-bold text-sm">
                    {calculateDays(applyForm.startDate, applyForm.endDate)} Day(s)
                  </span>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Absence <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  placeholder="Explain the purpose of your time off..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsApplyModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Submit Application
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================== REJECT REASON MODAL (ADMIN) =================== */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-fadeIn">
            <div className="flex items-start space-x-3">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                  Decline Leave Request
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Provide an optional explanation to <span className="font-semibold text-slate-800 dark:text-slate-200">{rejectTarget.employeeName}</span>.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Manager Remarks / Reason
              </label>
              <textarea
                rows={3}
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="e.g. Critical release sprint scheduled; please reschedule."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRejectTarget(null)}
                disabled={isReviewing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmReject}
                isLoading={isReviewing}
                disabled={isReviewing}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeavesPage;
