import api from './axios';
import type { CreateDepartmentRequest, Department, UpdateDepartmentRequest } from '../types/department';

export const departmentApi = {
  getAll: async (): Promise<Department[]> => {
    const response = await api.get<Department[]>('/departments');
    return response.data;
  },

  getById: async (id: number): Promise<Department> => {
    const response = await api.get<Department>(`/departments/${id}`);
    return response.data;
  },

  create: async (data: CreateDepartmentRequest): Promise<Department> => {
    const response = await api.post<Department>('/departments', data);
    return response.data;
  },

  update: async (id: number, data: UpdateDepartmentRequest): Promise<Department> => {
    const response = await api.put<Department>(`/departments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/departments/${id}`);
  },
};
