export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export type LeaveType = 'Casual' | 'Sick' | 'Annual' | 'Maternity/Paternity' | 'Unpaid';

export interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeEmail: string;
  departmentName: string;
  leaveType: LeaveType | string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus | string;
  adminNotes?: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
}

export interface CreateLeaveRequest {
  employeeId?: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface UpdateLeaveStatusRequest {
  status: 'Approved' | 'Rejected' | 'Cancelled';
  adminNotes?: string;
}

export interface LeaveSummary {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  casualLeaveBalance: number;
  sickLeaveBalance: number;
  annualLeaveBalance: number;
}
