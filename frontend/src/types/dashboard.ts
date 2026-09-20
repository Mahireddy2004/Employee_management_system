export interface DepartmentEmployeeCount {
  departmentId: number;
  departmentName: string;
  employeeCount: number;
}

export interface DepartmentBudget {
  departmentId: number;
  departmentName: string;
  budget: number;
  totalSalaryExpense: number;
}

export interface MonthlyHiringTrend {
  period: string;
  year: number;
  month: number;
  hiredCount: number;
}

export interface AttendanceTrend {
  date: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

export interface DashboardSummary {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveEmployees: number;
  terminatedEmployees: number;
  totalDepartments: number;
  monthlyPayroll: number;
  averageAttendanceRate: number;
  departmentEmployeeCounts: DepartmentEmployeeCount[];
  departmentBudgets: DepartmentBudget[];
  monthlyHiringTrends: MonthlyHiringTrend[];
  attendanceTrends: AttendanceTrend[];
}
