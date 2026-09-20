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
public class DepartmentsController : ControllerBase
{
    private readonly AppDbContext _context;

    public DepartmentsController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// GET /api/departments
    /// Returns all departments including employee counts.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<DepartmentResponseDto>>> GetAll()
    {
        var departments = await _context.Departments
            .AsNoTracking()
            .Select(d => new DepartmentResponseDto
            {
                Id = d.Id,
                Name = d.Name,
                Budget = d.Budget,
                Location = d.Location,
                EmployeeCount = d.Employees.Count()
            })
            .OrderBy(d => d.Name)
            .ToListAsync();

        return Ok(departments);
    }

    /// <summary>
    /// GET /api/departments/{id}
    /// Returns a specific department with its employee count.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<DepartmentResponseDto>> GetById(int id)
    {
        var department = await _context.Departments
            .AsNoTracking()
            .Where(d => d.Id == id)
            .Select(d => new DepartmentResponseDto
            {
                Id = d.Id,
                Name = d.Name,
                Budget = d.Budget,
                Location = d.Location,
                EmployeeCount = d.Employees.Count()
            })
            .FirstOrDefaultAsync();

        if (department == null)
        {
            return NotFound(new { message = $"Department with ID {id} was not found." });
        }

        return Ok(department);
    }

    /// <summary>
    /// POST /api/departments
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<DepartmentResponseDto>> Create([FromBody] CreateDepartmentDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var normalizedName = dto.Name.Trim().ToLowerInvariant();
        var nameExists = await _context.Departments
            .AnyAsync(d => d.Name.ToLower() == normalizedName);

        if (nameExists)
        {
            return Conflict(new { message = $"A department with the name '{dto.Name}' already exists." });
        }

        var department = new Department
        {
            Name = dto.Name.Trim(),
            Budget = dto.Budget,
            Location = dto.Location?.Trim()
        };

        _context.Departments.Add(department);
        await _context.SaveChangesAsync();

        var response = new DepartmentResponseDto
        {
            Id = department.Id,
            Name = department.Name,
            Budget = department.Budget,
            Location = department.Location,
            EmployeeCount = 0
        };

        return CreatedAtAction(nameof(GetById), new { id = department.Id }, response);
    }

    /// <summary>
    /// PUT /api/departments/{id}
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<DepartmentResponseDto>> Update(int id, [FromBody] UpdateDepartmentDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var department = await _context.Departments.FindAsync(id);
        if (department == null)
        {
            return NotFound(new { message = $"Department with ID {id} was not found." });
        }

        var normalizedName = dto.Name.Trim().ToLowerInvariant();
        var nameExists = await _context.Departments
            .AnyAsync(d => d.Name.ToLower() == normalizedName && d.Id != id);

        if (nameExists)
        {
            return Conflict(new { message = $"Another department with the name '{dto.Name}' already exists." });
        }

        department.Name = dto.Name.Trim();
        department.Budget = dto.Budget;
        department.Location = dto.Location?.Trim();

        await _context.SaveChangesAsync();

        var employeeCount = await _context.Employees.CountAsync(e => e.DepartmentId == id);

        var response = new DepartmentResponseDto
        {
            Id = department.Id,
            Name = department.Name,
            Budget = department.Budget,
            Location = department.Location,
            EmployeeCount = employeeCount
        };

        return Ok(response);
    }

    /// <summary>
    /// DELETE /api/departments/{id}
    /// Prevents unsafe deletion if employees still belong to this department.
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var department = await _context.Departments.FindAsync(id);
        if (department == null)
        {
            return NotFound(new { message = $"Department with ID {id} was not found." });
        }

        var employeeCount = await _context.Employees.CountAsync(e => e.DepartmentId == id);
        if (employeeCount > 0)
        {
            return BadRequest(new
            {
                message = $"Cannot delete department '{department.Name}' because it currently contains {employeeCount} employee(s). Reassign or delete the employees before deleting this department."
            });
        }

        _context.Departments.Remove(department);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
