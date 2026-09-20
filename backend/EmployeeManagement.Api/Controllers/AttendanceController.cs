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

    /// <summary>
    /// GET /api/attendance
    /// Supports filtering by employeeId, date, and status.
    /// Example: /api/attendance?employeeId=5&date=2026-09-20&status=Present
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AttendanceResponseDto>>> GetAll(
        [FromQuery] int? employeeId = null,
        [FromQuery] DateTime? date = null,
        [FromQuery] string? status = null)
    {
        var query = _context.Attendance
            .Include(a => a.Employee)
            .AsNoTracking()
            .AsQueryable();

        // Filter by employeeId
        if (employeeId.HasValue && employeeId.Value > 0)
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

        return Ok(ToDto(attendance));
    }

    /// <summary>
    /// POST /api/attendance
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<AttendanceResponseDto>> Create([FromBody] CreateAttendanceDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // Validate that Employee exists
        var employee = await _context.Employees.FindAsync(dto.EmployeeId);
        if (employee == null)
        {
            return BadRequest(new { message = $"Employee with ID {dto.EmployeeId} does not exist." });
        }

        // Prevent duplicate attendance entry for the same employee on the same date
        var targetDate = dto.Date.Date;
        var exists = await _context.Attendance
            .AnyAsync(a => a.EmployeeId == dto.EmployeeId && a.Date.Date == targetDate);

        if (exists)
        {
            return Conflict(new
            {
                message = $"An attendance record for employee ID {dto.EmployeeId} on date {targetDate:yyyy-MM-dd} already exists."
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
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
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
