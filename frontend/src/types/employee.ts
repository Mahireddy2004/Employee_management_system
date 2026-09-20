export type EmployeeStatus = 'Active' | 'OnLeave' | 'Terminated';

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  hireDate: string;
  salary: number;
  departmentId: number;
  departmentName?: string;
  status: EmployeeStatus;
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  hireDate: string;
  salary: number;
  departmentId: number;
  status: EmployeeStatus;
}

export interface UpdateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  hireDate: string;
  salary: number;
  departmentId: number;
  status: EmployeeStatus;
}

export interface BulkCreateEmployeeRequest {
  employees: CreateEmployeeRequest[];
}

export interface BulkDeleteEmployeeRequest {
  employeeIds: number[];
}

export interface BulkOperationResult {
  totalRequested: number;
  successCount: number;
  failureCount: number;
  errors: string[];
}

export interface PaginatedResult<T> {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: T[];
}

export interface EmployeeQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  departmentId?: number;
  status?: string;
}
