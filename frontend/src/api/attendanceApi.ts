import api from './axios';
import type {
  Attendance,
  AttendanceQueryParams,
  CreateAttendanceRequest,
  UpdateAttendanceRequest,
} from '../types/attendance';

export const attendanceApi = {
  getAll: async (params?: AttendanceQueryParams): Promise<Attendance[]> => {
    const response = await api.get<Attendance[]>('/attendance', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Attendance> => {
    const response = await api.get<Attendance>(`/attendance/${id}`);
    return response.data;
  },

  create: async (data: CreateAttendanceRequest): Promise<Attendance> => {
    const response = await api.post<Attendance>('/attendance', data);
    return response.data;
  },

  update: async (id: number, data: UpdateAttendanceRequest): Promise<Attendance> => {
    const response = await api.put<Attendance>(`/attendance/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/attendance/${id}`);
  },
};
