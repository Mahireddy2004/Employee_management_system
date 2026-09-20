using EmployeeManagement.Api.Data;
using EmployeeManagement.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagement.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;

    public DashboardController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// GET /api/dashboard/summary
    /// Aggregates KPI indicators and chart series data for the React dashboard.
    /// </summary>
    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary()
    {
        // 1. Total Employees
        var totalEmployees = await _context.Employees.CountAsync();

        // 2. Employee Status Distribution
        var statusGroups = await _context.Employees
            .GroupBy(e => e.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        int activeEmployees = 0;
        int onLeaveEmployees = 0;
        int terminatedEmployees = 0;

        foreach (var group in statusGroups)
        {
            if (string.Equals(group.Status, "Active", StringComparison.OrdinalIgnoreCase))
                activeEmployees = group.Count;
            else if (string.Equals(group.Status, "OnLeave", StringComparison.OrdinalIgnoreCase))
                onLeaveEmployees = group.Count;
            else if (string.Equals(group.Status, "Terminated", StringComparison.OrdinalIgnoreCase))
                terminatedEmployees = group.Count;
        }

        // 3. Total Departments
        var totalDepartments = await _context.Departments.CountAsync();

        // 4. Monthly Payroll (Active employees total salary / 12)
        var totalActiveSalary = await _context.Employees
            .Where(e => e.Status == "Active")
            .SumAsync(e => (decimal?)e.Salary) ?? 0m;
        var monthlyPayroll = Math.Round(totalActiveSalary / 12m, 2);

        // 5. Average Attendance Rate (Present records / Total records)
        var totalAttendance = await _context.Attendance.CountAsync();
        var presentAttendance = await _context.Attendance
            .Where(a => a.Status == "Present")
            .CountAsync();

        var averageAttendanceRate = totalAttendance > 0
            ? Math.Round(((double)presentAttendance / totalAttendance) * 100, 2)
            : 0.0;

        // 6. Department Stats (Employee counts and budgets)
        var departmentStats = await _context.Departments
            .AsNoTracking()
            .Select(d => new
            {
                d.Id,
                d.Name,
                d.Budget,
                EmployeeCount = d.Employees.Count(),
                TotalSalaryExpense = d.Employees
                    .Where(e => e.Status == "Active")
                    .Sum(e => (decimal?)e.Salary) ?? 0m
            })
            .OrderBy(d => d.Name)
            .ToListAsync();

        var deptCounts = departmentStats.Select(d => new DepartmentEmployeeCountDto
        {
            DepartmentId = d.Id,
            DepartmentName = d.Name,
            EmployeeCount = d.EmployeeCount
        }).ToList();

        var deptBudgets = departmentStats.Select(d => new DepartmentBudgetDto
        {
            DepartmentId = d.Id,
            DepartmentName = d.Name,
            Budget = d.Budget,
            TotalSalaryExpense = d.TotalSalaryExpense
        }).ToList();

        // 7. Monthly Hiring Trends (Last 12 months timeline)
        var now = DateTime.UtcNow;
        var twelveMonthsAgo = new DateTime(now.Year, now.Month, 1).AddMonths(-11);

        var rawHires = await _context.Employees
            .AsNoTracking()
            .Where(e => e.HireDate >= twelveMonthsAgo)
            .Select(e => e.HireDate)
            .ToListAsync();

        var hires = rawHires
            .GroupBy(d => new { d.Year, d.Month })
            .Select(g => new
            {
                g.Key.Year,
                g.Key.Month,
                Count = g.Count()
            })
            .ToList();

        var hiringTrends = new List<MonthlyHiringTrendDto>();
        for (int i = 0; i < 12; i++)
        {
            var targetMonth = twelveMonthsAgo.AddMonths(i);
            var hireEntry = hires.FirstOrDefault(h => h.Year == targetMonth.Year && h.Month == targetMonth.Month);
            hiringTrends.Add(new MonthlyHiringTrendDto
            {
                Period = targetMonth.ToString("MMM yyyy"),
                Year = targetMonth.Year,
                Month = targetMonth.Month,
                HiredCount = hireEntry?.Count ?? 0
            });
        }

        // 8. Attendance Trends (Last 14 days timeline)
        var fourteenDaysAgo = now.Date.AddDays(-13);

        var rawAttendance = await _context.Attendance
            .AsNoTracking()
            .Where(a => a.Date >= fourteenDaysAgo)
            .Select(a => new { a.Date, a.Status })
            .ToListAsync();

        var attendanceLogs = rawAttendance
            .GroupBy(a => a.Date.Date)
            .Select(g => new
            {
                Date = g.Key,
                Present = g.Count(x => string.Equals(x.Status, "Present", StringComparison.OrdinalIgnoreCase)),
                Absent = g.Count(x => string.Equals(x.Status, "Absent", StringComparison.OrdinalIgnoreCase)),
                Late = g.Count(x => string.Equals(x.Status, "Late", StringComparison.OrdinalIgnoreCase)),
                Excused = g.Count(x => string.Equals(x.Status, "Excused", StringComparison.OrdinalIgnoreCase)),
                Total = g.Count()
            })
            .ToList();

        var attendanceTrends = new List<AttendanceTrendDto>();
        for (int i = 0; i < 14; i++)
        {
            var targetDate = fourteenDaysAgo.AddDays(i);
            var entry = attendanceLogs.FirstOrDefault(a => a.Date == targetDate);
            attendanceTrends.Add(new AttendanceTrendDto
            {
                Date = targetDate.ToString("yyyy-MM-dd"),
                Present = entry?.Present ?? 0,
                Absent = entry?.Absent ?? 0,
                Late = entry?.Late ?? 0,
                Excused = entry?.Excused ?? 0,
                Total = entry?.Total ?? 0
            });
        }

        var response = new DashboardSummaryDto
        {
            TotalEmployees = totalEmployees,
            ActiveEmployees = activeEmployees,
            OnLeaveEmployees = onLeaveEmployees,
            TerminatedEmployees = terminatedEmployees,
            TotalDepartments = totalDepartments,
            MonthlyPayroll = monthlyPayroll,
            AverageAttendanceRate = averageAttendanceRate,
            DepartmentEmployeeCounts = deptCounts,
            DepartmentBudgets = deptBudgets,
            MonthlyHiringTrends = hiringTrends,
            AttendanceTrends = attendanceTrends
        };

        return Ok(response);
    }
}
