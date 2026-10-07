using System.Security.Claims;
using EmployeeManagement.Api.Data;
using EmployeeManagement.Api.DTOs;
using EmployeeManagement.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagement.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class LeavesController : ControllerBase
{
    private readonly AppDbContext _context;

    public LeavesController(AppDbContext context)
    {
        _context = context;
    }

    private string? GetCurrentUserEmail()
    {
        return User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.Name) ?? User.Identity?.Name;
    }

    private bool IsAdminUser()
    {
        var role = User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role");
        return string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// GET /api/leaves
    /// Admins can view all leaves. Employees only view their own leave requests.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<LeaveResponseDto>>> GetAll(
        [FromQuery] int? employeeId = null,
        [FromQuery] string? status = null,
        [FromQuery] string? leaveType = null)
    {
        var isAdmin = IsAdminUser();
        var userEmail = GetCurrentUserEmail();

        var query = _context.LeaveRequests
            .Include(l => l.Employee)
                .ThenInclude(e => e!.Department)
            .AsNoTracking()
            .AsQueryable();

        // If not admin, restrict to caller's own employee record
        if (!isAdmin)
        {
            if (string.IsNullOrWhiteSpace(userEmail))
            {
                return Forbid();
            }

            query = query.Where(l => l.Employee != null && l.Employee.Email.ToLower() == userEmail.ToLower());
        }
        else if (employeeId.HasValue && employeeId.Value > 0)
        {
            query = query.Where(l => l.EmployeeId == employeeId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var s = status.Trim().ToLower();
            query = query.Where(l => l.Status.ToLower() == s);
        }

        if (!string.IsNullOrWhiteSpace(leaveType))
        {
            var lt = leaveType.Trim().ToLower();
            query = query.Where(l => l.LeaveType.ToLower() == lt);
        }

        var results = await query
            .OrderByDescending(l => l.CreatedAt)
            .Select(l => new LeaveResponseDto
            {
                Id = l.Id,
                EmployeeId = l.EmployeeId,
                EmployeeName = l.Employee != null ? $"{l.Employee.FirstName} {l.Employee.LastName}" : "Unknown",
                EmployeeEmail = l.Employee != null ? l.Employee.Email : string.Empty,
                DepartmentName = l.Employee != null && l.Employee.Department != null ? l.Employee.Department.Name : "Unassigned",
                LeaveType = l.LeaveType,
                StartDate = l.StartDate,
                EndDate = l.EndDate,
                TotalDays = l.TotalDays,
                Reason = l.Reason,
                Status = l.Status,
                AdminNotes = l.AdminNotes,
                CreatedAt = l.CreatedAt,
                ProcessedAt = l.ProcessedAt,
                ProcessedBy = l.ProcessedBy
            })
            .ToListAsync();

        return Ok(results);
    }

    /// <summary>
    /// GET /api/leaves/summary
    /// Returns leave statistics and balances.
    /// </summary>
    [HttpGet("summary")]
    public async Task<ActionResult<LeaveSummaryDto>> GetSummary([FromQuery] int? employeeId = null)
    {
        var isAdmin = IsAdminUser();
        var userEmail = GetCurrentUserEmail();

        var query = _context.LeaveRequests.AsNoTracking().AsQueryable();

        if (!isAdmin)
        {
            if (string.IsNullOrWhiteSpace(userEmail))
            {
                return Forbid();
            }
            query = query.Where(l => l.Employee != null && l.Employee.Email.ToLower() == userEmail.ToLower());
        }
        else if (employeeId.HasValue && employeeId.Value > 0)
        {
            query = query.Where(l => l.EmployeeId == employeeId.Value);
        }

        var total = await query.CountAsync();
        var pending = await query.CountAsync(l => l.Status == LeaveStatus.Pending);
        var approved = await query.CountAsync(l => l.Status == LeaveStatus.Approved);
        var rejected = await query.CountAsync(l => l.Status == LeaveStatus.Rejected);

        // Deduct approved days from annual quota
        var approvedCasualDays = await query
            .Where(l => l.Status == LeaveStatus.Approved && l.LeaveType == LeaveType.Casual)
            .SumAsync(l => (int?)l.TotalDays) ?? 0;

        var approvedSickDays = await query
            .Where(l => l.Status == LeaveStatus.Approved && l.LeaveType == LeaveType.Sick)
            .SumAsync(l => (int?)l.TotalDays) ?? 0;

        var approvedAnnualDays = await query
            .Where(l => l.Status == LeaveStatus.Approved && l.LeaveType == LeaveType.Annual)
            .SumAsync(l => (int?)l.TotalDays) ?? 0;

        return Ok(new LeaveSummaryDto
        {
            TotalRequests = total,
            PendingRequests = pending,
            ApprovedRequests = approved,
            RejectedRequests = rejected,
            CasualLeaveBalance = Math.Max(0, 12 - approvedCasualDays),
            SickLeaveBalance = Math.Max(0, 10 - approvedSickDays),
            AnnualLeaveBalance = Math.Max(0, 15 - approvedAnnualDays)
        });
    }

    /// <summary>
    /// POST /api/leaves
    /// Submits a new leave application.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<LeaveResponseDto>> Create([FromBody] CreateLeaveRequestDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        if (dto.EndDate.Date < dto.StartDate.Date)
        {
            return BadRequest(new { message = "End date cannot be earlier than start date." });
        }

        int targetEmployeeId = 0;
        var isAdmin = IsAdminUser();
        var userEmail = GetCurrentUserEmail();

        if (isAdmin && dto.EmployeeId.HasValue && dto.EmployeeId.Value > 0)
        {
            targetEmployeeId = dto.EmployeeId.Value;
        }
        else
        {
            if (string.IsNullOrWhiteSpace(userEmail))
            {
                return Unauthorized(new { message = "User identity not found in request." });
            }

            var emp = await _context.Employees.FirstOrDefaultAsync(e => e.Email.ToLower() == userEmail.ToLower());
            if (emp == null)
            {
                return BadRequest(new { message = "Your employee profile was not found. Please contact administration." });
            }
            targetEmployeeId = emp.Id;
        }

        var employee = await _context.Employees
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.Id == targetEmployeeId);

        if (employee == null)
        {
            return NotFound(new { message = "Specified employee record was not found." });
        }

        var totalDays = Math.Max(1, (dto.EndDate.Date - dto.StartDate.Date).Days + 1);

        var leave = new LeaveRequest
        {
            EmployeeId = targetEmployeeId,
            LeaveType = dto.LeaveType,
            StartDate = dto.StartDate.Date,
            EndDate = dto.EndDate.Date,
            TotalDays = totalDays,
            Reason = dto.Reason.Trim(),
            Status = LeaveStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.LeaveRequests.Add(leave);
        await _context.SaveChangesAsync();

        var response = new LeaveResponseDto
        {
            Id = leave.Id,
            EmployeeId = employee.Id,
            EmployeeName = $"{employee.FirstName} {employee.LastName}",
            EmployeeEmail = employee.Email,
            DepartmentName = employee.Department?.Name ?? "Unassigned",
            LeaveType = leave.LeaveType,
            StartDate = leave.StartDate,
            EndDate = leave.EndDate,
            TotalDays = leave.TotalDays,
            Reason = leave.Reason,
            Status = leave.Status,
            CreatedAt = leave.CreatedAt
        };

        return CreatedAtAction(nameof(GetAll), new { id = leave.Id }, response);
    }

    /// <summary>
    /// PUT /api/leaves/{id}/status
    /// Admin / Manager approves or rejects a leave application.
    /// </summary>
    [HttpPut("{id:int}/status")]
    public async Task<ActionResult<LeaveResponseDto>> UpdateStatus(int id, [FromBody] UpdateLeaveStatusDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        if (!IsAdminUser())
        {
            return Forbid();
        }

        var leave = await _context.LeaveRequests
            .Include(l => l.Employee)
                .ThenInclude(e => e!.Department)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (leave == null)
        {
            return NotFound(new { message = $"Leave request #{id} was not found." });
        }

        leave.Status = dto.Status;
        leave.AdminNotes = dto.AdminNotes?.Trim();
        leave.ProcessedAt = DateTime.UtcNow;
        leave.ProcessedBy = GetCurrentUserEmail() ?? "Admin";

        // If approved and the leave dates include today, update employee status to OnLeave
        if (leave.Employee != null)
        {
            var today = DateTime.UtcNow.Date;
            if (dto.Status == LeaveStatus.Approved && today >= leave.StartDate.Date && today <= leave.EndDate.Date)
            {
                leave.Employee.Status = EmployeeStatus.OnLeave;
            }
            else if (dto.Status == LeaveStatus.Rejected && leave.Employee.Status == EmployeeStatus.OnLeave)
            {
                leave.Employee.Status = EmployeeStatus.Active;
            }
        }

        await _context.SaveChangesAsync();

        var response = new LeaveResponseDto
        {
            Id = leave.Id,
            EmployeeId = leave.EmployeeId,
            EmployeeName = leave.Employee != null ? $"{leave.Employee.FirstName} {leave.Employee.LastName}" : "Unknown",
            EmployeeEmail = leave.Employee != null ? leave.Employee.Email : string.Empty,
            DepartmentName = leave.Employee != null && leave.Employee.Department != null ? leave.Employee.Department.Name : "Unassigned",
            LeaveType = leave.LeaveType,
            StartDate = leave.StartDate,
            EndDate = leave.EndDate,
            TotalDays = leave.TotalDays,
            Reason = leave.Reason,
            Status = leave.Status,
            AdminNotes = leave.AdminNotes,
            CreatedAt = leave.CreatedAt,
            ProcessedAt = leave.ProcessedAt,
            ProcessedBy = leave.ProcessedBy
        };

        return Ok(response);
    }
}
