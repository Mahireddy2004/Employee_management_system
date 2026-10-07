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
public class AttendanceController : ControllerBase
{
    private readonly AppDbContext _context;

    public AttendanceController(AppDbContext context)
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
    /// GET /api/attendance
    /// Managers/Admins can view all records and filter by employeeId, date, status.
    /// Employees can only view their own attendance history.
    /// Example: /api/attendance?employeeId=5&date=2026-09-20&status=Present
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AttendanceResponseDto>>> GetAll(
        [FromQuery] int? employeeId = null,
        [FromQuery] DateTime? date = null,
        [FromQuery] string? status = null)
    {
        var isAdmin = IsAdminUser();
        var userEmail = GetCurrentUserEmail();

        var query = _context.Attendance
            .Include(a => a.Employee)
            .AsNoTracking()
            .AsQueryable();

        // If not admin, restrict to caller's own employee record
        if (!isAdmin)
        {
            if (string.IsNullOrWhiteSpace(userEmail))
            {
                return Forbid();
            }

            query = query.Where(a => a.Employee != null && a.Employee.Email.ToLower() == userEmail.ToLower());
        }
        else if (employeeId.HasValue && employeeId.Value > 0)
        {
            query = query.Where(a => a.EmployeeId == employeeId.Value);
        }

        // Filter by date
        if (date.HasValue)
        {
            var targetDate = date.Value.Date;
            query = query.Where(a => a.Date.Date == targetDate);
        }

        // Filter by status (Present, Absent, Late, Excused)
        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim().ToLower();
            query = query.Where(a => a.Status.ToLower() == normalizedStatus);
        }

        var results = await query
            .OrderByDescending(a => a.Date)
            .ThenBy(a => a.EmployeeId)
            .Select(a => ToDto(a))
            .ToListAsync();

        return Ok(results);
    }

    /// <summary>
    /// GET /api/attendance/{id}
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<AttendanceResponseDto>> GetById(int id)
    {
        var attendance = await _context.Attendance
            .Include(a => a.Employee)
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id);

        if (attendance == null)
        {
            return NotFound(new { message = $"Attendance record with ID {id} was not found." });
        }

        var isAdmin = IsAdminUser();
        var userEmail = GetCurrentUserEmail();
        if (!isAdmin && (attendance.Employee == null || !string.Equals(attendance.Employee.Email, userEmail, StringComparison.OrdinalIgnoreCase)))
        {
            return Forbid();
        }

        return Ok(ToDto(attendance));
    }

    /// <summary>
    /// POST /api/attendance
    /// Clock-In action: Employees can clock in for themselves. Managers can record attendance for any staff member.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<AttendanceResponseDto>> Create([FromBody] CreateAttendanceDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var isAdmin = IsAdminUser();
        var userEmail = GetCurrentUserEmail();

        // Validate that Employee exists
        var employee = await _context.Employees.FindAsync(dto.EmployeeId);
        if (employee == null)
        {
            return BadRequest(new { message = $"Employee with ID {dto.EmployeeId} does not exist." });
        }

        // If not admin, verify that the employee is clocking in for themselves
        if (!isAdmin)
        {
            if (string.IsNullOrWhiteSpace(userEmail) || !string.Equals(employee.Email, userEmail, StringComparison.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "You can only record attendance and clock in for yourself." });
            }
        }

        // Prevent duplicate attendance entry for the same employee on the same date
        var targetDate = dto.Date.Date;
        var exists = await _context.Attendance
            .AnyAsync(a => a.EmployeeId == dto.EmployeeId && a.Date.Date == targetDate);

        if (exists)
        {
            return Conflict(new
            {
                message = $"An attendance record for employee {employee.FirstName} {employee.LastName} on {targetDate:yyyy-MM-dd} already exists."
            });
        }

        var attendance = new Attendance
        {
            EmployeeId = dto.EmployeeId,
            Date = targetDate,
            Status = dto.Status.Trim(),
            CheckInTime = dto.CheckInTime,
            CheckOutTime = dto.CheckOutTime,
            Employee = employee
        };

        _context.Attendance.Add(attendance);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = attendance.Id }, ToDto(attendance));
    }

    /// <summary>
    /// PUT /api/attendance/{id}
    /// Clock-Out action: Employees can clock out for themselves. Managers can update any record.
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<AttendanceResponseDto>> Update(int id, [FromBody] UpdateAttendanceDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var attendance = await _context.Attendance
            .Include(a => a.Employee)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (attendance == null)
        {
            return NotFound(new { message = $"Attendance record with ID {id} was not found." });
        }

        var isAdmin = IsAdminUser();
        var userEmail = GetCurrentUserEmail();

        // If not admin, the employee can only update their own record to clock out
        if (!isAdmin)
        {
            if (string.IsNullOrWhiteSpace(userEmail) || attendance.Employee == null || !string.Equals(attendance.Employee.Email, userEmail, StringComparison.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "You can only update your own attendance." });
            }

            // Employees may only clock out (update checkOutTime)
            attendance.CheckOutTime = dto.CheckOutTime;
            await _context.SaveChangesAsync();
            return Ok(ToDto(attendance));
        }

        var targetDate = dto.Date.Date;

        // Check duplicate if date is changed
        var duplicateExists = await _context.Attendance
            .AnyAsync(a => a.EmployeeId == attendance.EmployeeId && a.Date.Date == targetDate && a.Id != id);

        if (duplicateExists)
        {
            return Conflict(new
            {
                message = $"Another attendance record for this employee on date {targetDate:yyyy-MM-dd} already exists."
            });
        }

        attendance.Date = targetDate;
        attendance.Status = dto.Status.Trim();
        attendance.CheckInTime = dto.CheckInTime;
        attendance.CheckOutTime = dto.CheckOutTime;

        await _context.SaveChangesAsync();

        return Ok(ToDto(attendance));
    }

    /// <summary>
    /// DELETE /api/attendance/{id}
    /// Only Managers / Admins can delete attendance records.
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!IsAdminUser())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only managers and administrators can delete attendance records." });
        }

        var attendance = await _context.Attendance.FindAsync(id);
        if (attendance == null)
        {
            return NotFound(new { message = $"Attendance record with ID {id} was not found." });
        }

        _context.Attendance.Remove(attendance);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static AttendanceResponseDto ToDto(Attendance a) => new()
    {
        Id = a.Id,
        EmployeeId = a.EmployeeId,
        EmployeeName = a.Employee != null ? $"{a.Employee.FirstName} {a.Employee.LastName}".Trim() : null,
        EmployeeEmail = a.Employee?.Email,
        Date = a.Date,
        Status = a.Status,
        CheckInTime = a.CheckInTime,
        CheckOutTime = a.CheckOutTime
    };
}
