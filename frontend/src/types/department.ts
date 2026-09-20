export interface Department {
  id: number;
  name: string;
  budget: number;
  location?: string;
  employeeCount: number;
}

export interface CreateDepartmentRequest {
  name: string;
  budget: number;
  location?: string;
}

export interface UpdateDepartmentRequest {
  name: string;
  budget: number;
  location?: string;
}
