import api from './axios';
import type {
  CreateLeaveRequest,
  LeaveRequest,
  LeaveSummary,
  UpdateLeaveStatusRequest,
} from '../types/leave';

export const leaveApi = {
  getAll: async (params?: { employeeId?: number; status?: string; leaveType?: string }): Promise<LeaveRequest[]> => {
    const response = await api.get<LeaveRequest[]>('/leaves', { params });
    return response.data;
  },

  getSummary: async (employeeId?: number): Promise<LeaveSummary> => {
    const response = await api.get<LeaveSummary>('/leaves/summary', { params: { employeeId } });
    return response.data;
  },

  create: async (data: CreateLeaveRequest): Promise<LeaveRequest> => {
    const response = await api.post<LeaveRequest>('/leaves', data);
    return response.data;
  },

  updateStatus: async (id: number, data: UpdateLeaveStatusRequest): Promise<LeaveRequest> => {
    const response = await api.put<LeaveRequest>(`/leaves/${id}/status`, data);
    return response.data;
  },
};
