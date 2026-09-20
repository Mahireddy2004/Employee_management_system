namespace EmployeeManagement.Api.DTOs;

public class DashboardSummaryDto
{
    public int TotalEmployees { get; set; }
    public int ActiveEmployees { get; set; }
    public int OnLeaveEmployees { get; set; }
    public int TerminatedEmployees { get; set; }
    public int TotalDepartments { get; set; }
    public decimal MonthlyPayroll { get; set; }
    public double AverageAttendanceRate { get; set; }

    public List<DepartmentEmployeeCountDto> DepartmentEmployeeCounts { get; set; } = new();
    public List<DepartmentBudgetDto> DepartmentBudgets { get; set; } = new();
    public List<MonthlyHiringTrendDto> MonthlyHiringTrends { get; set; } = new();
    public List<AttendanceTrendDto> AttendanceTrends { get; set; } = new();
}

public class DepartmentEmployeeCountDto
{
    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public int EmployeeCount { get; set; }
}

public class DepartmentBudgetDto
{
    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public decimal Budget { get; set; }
    public decimal TotalSalaryExpense { get; set; }
}

public class MonthlyHiringTrendDto
{
    public string Period { get; set; } = string.Empty;
    public int Year { get; set; }
    public int Month { get; set; }
    public int HiredCount { get; set; }
}

public class AttendanceTrendDto
{
    public string Date { get; set; } = string.Empty;
    public int Present { get; set; }
    public int Absent { get; set; }
    public int Late { get; set; }
    public int Excused { get; set; }
    public int Total { get; set; }
}
