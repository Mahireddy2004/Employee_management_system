import api from './axios';
import type {
  BulkCreateEmployeeRequest,
  BulkDeleteEmployeeRequest,
  BulkOperationResult,
  CreateEmployeeRequest,
  Employee,
  EmployeeQueryParams,
  PaginatedResult,
  UpdateEmployeeRequest,
} from '../types/employee';

export const employeeApi = {
  getAll: async (params?: EmployeeQueryParams): Promise<PaginatedResult<Employee>> => {
    const response = await api.get<PaginatedResult<Employee>>('/employees', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Employee> => {
    const response = await api.get<Employee>(`/employees/${id}`);
    return response.data;
  },

  create: async (data: CreateEmployeeRequest): Promise<Employee> => {
    const response = await api.post<Employee>('/employees', data);
    return response.data;
  },

  update: async (id: number, data: UpdateEmployeeRequest): Promise<Employee> => {
    const response = await api.put<Employee>(`/employees/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/employees/${id}`);
  },

  bulkCreate: async (data: BulkCreateEmployeeRequest): Promise<BulkOperationResult> => {
    const response = await api.post<BulkOperationResult>('/employees/bulk-create', data);
    return response.data;
  },

  bulkDelete: async (data: BulkDeleteEmployeeRequest): Promise<BulkOperationResult> => {
    const response = await api.post<BulkOperationResult>('/employees/bulk-delete', data);
    return response.data;
  },
};
