namespace EmployeeManagement.Api.Services;

using EmployeeManagement.Api.Data;
using EmployeeManagement.Api.Models;
using Microsoft.EntityFrameworkCore;

public static class EmployeeStatusHelper
{
    /// <summary>
    /// Synchronizes employee statuses with active approved leave requests for the current UTC date.
    /// - If an employee is marked OnLeave but has no approved leave covering today, automatically restores them to Active.
    /// - If an employee is marked Active but has an approved leave covering today, automatically sets them to OnLeave.
    /// Soft-deleted or Terminated employees are preserved and never altered.
    /// </summary>
    public static async Task SyncEmployeeStatusesAsync(AppDbContext context)
    {
        var today = DateTime.UtcNow.Date;

        // 1. Employees currently marked 'OnLeave'
        var onLeaveEmployees = await context.Employees
            .Where(e => !e.IsDeleted && e.Status == EmployeeStatus.OnLeave)
            .ToListAsync();

        if (onLeaveEmployees.Count > 0)
        {
            var empIds = onLeaveEmployees.Select(e => e.Id).ToList();

            // Find which of these employees actually have an active approved leave TODAY
            var activeLeaveEmpIds = (await context.LeaveRequests
                .Where(l => empIds.Contains(l.EmployeeId) &&
                            l.Status == LeaveStatus.Approved &&
                            l.StartDate.Date <= today &&
                            l.EndDate.Date >= today)
                .Select(l => l.EmployeeId)
                .Distinct()
                .ToListAsync())
                .ToHashSet();

            bool changed = false;
            foreach (var emp in onLeaveEmployees)
            {
                if (!activeLeaveEmpIds.Contains(emp.Id))
                {
                    emp.Status = EmployeeStatus.Active;
                    emp.UpdatedAt = DateTime.UtcNow;
                    changed = true;
                }
            }

            if (changed)
            {
                await context.SaveChangesAsync();
            }
        }

        // 2. Employees currently marked 'Active' who have an approved leave covering today
        var activeWithLeavesToday = await context.LeaveRequests
            .Include(l => l.Employee)
            .Where(l => l.Status == LeaveStatus.Approved &&
                        l.StartDate.Date <= today &&
                        l.EndDate.Date >= today &&
                        l.Employee != null &&
                        !l.Employee.IsDeleted &&
                        l.Employee.Status == EmployeeStatus.Active)
            .Select(l => l.Employee!)
            .Distinct()
            .ToListAsync();

        if (activeWithLeavesToday.Count > 0)
        {
            foreach (var emp in activeWithLeavesToday)
            {
                emp.Status = EmployeeStatus.OnLeave;
                emp.UpdatedAt = DateTime.UtcNow;
            }
            await context.SaveChangesAsync();
        }
    }
}
