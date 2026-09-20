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
public class EmployeesController : ControllerBase
{
    private readonly AppDbContext _context;

    public EmployeesController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// GET /api/employees
    /// Supports pagination, search, department filtering, and status filtering.
    /// Example: /api/employees?page=1&pageSize=10&search=John&departmentId=1&status=Active
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PaginatedResultDto<EmployeeResponseDto>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] int? departmentId = null,
        [FromQuery] string? status = null)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize < 1 ? 10 : (pageSize > 100 ? 100 : pageSize);

        var query = _context.Employees
            .Include(e => e.Department)
            .AsNoTracking()
            .AsQueryable();

        // Search filter (First Name, Last Name, Email, Phone)
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(e =>
                e.FirstName.ToLower().Contains(s) ||
                e.LastName.ToLower().Contains(s) ||
                e.Email.ToLower().Contains(s) ||
                (e.Phone != null && e.Phone.Contains(s)));
        }

        // Department filter
        if (departmentId.HasValue && departmentId.Value > 0)
        {
            query = query.Where(e => e.DepartmentId == departmentId.Value);
        }

        // Status filter
        if (!string.IsNullOrWhiteSpace(status))
        {
            var st = status.Trim().ToLower();
            query = query.Where(e => e.Status.ToLower() == st);
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderBy(e => e.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => ToDto(e))
            .ToListAsync();

        var response = new PaginatedResultDto<EmployeeResponseDto>
        {
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            Items = items
        };

        return Ok(response);
    }

    /// <summary>
    /// GET /api/employees/{id}
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<EmployeeResponseDto>> GetById(int id)
    {
        var employee = await _context.Employees
            .Include(e => e.Department)
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == id);

        if (employee == null)
        {
            return NotFound(new { message = $"Employee with ID {id} was not found." });
        }

        return Ok(ToDto(employee));
    }

    /// <summary>
    /// POST /api/employees
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<EmployeeResponseDto>> Create([FromBody] CreateEmployeeDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        if (dto.Salary <= 0)
        {
            return BadRequest(new { message = "Salary must be greater than 0." });
        }

        // Validate DepartmentId
        var department = await _context.Departments.FindAsync(dto.DepartmentId);
        if (department == null)
        {
            return BadRequest(new { message = $"Department with ID {dto.DepartmentId} does not exist." });
        }

        // Validate unique email
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var emailExists = await _context.Employees.AnyAsync(e => e.Email.ToLower() == normalizedEmail);
        if (emailExists)
        {
            return Conflict(new { message = $"An employee with email '{dto.Email}' already exists." });
        }

        var employee = new Employee
        {
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName.Trim(),
            Email = normalizedEmail,
            Phone = dto.Phone?.Trim(),
            HireDate = dto.HireDate,
            Salary = dto.Salary,
            DepartmentId = dto.DepartmentId,
            Status = dto.Status.Trim(),
            Department = department
        };

        _context.Employees.Add(employee);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = employee.Id }, ToDto(employee));
    }

    /// <summary>
    /// PUT /api/employees/{id}
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<EmployeeResponseDto>> Update(int id, [FromBody] UpdateEmployeeDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        if (dto.Salary <= 0)
        {
            return BadRequest(new { message = "Salary must be greater than 0." });
        }

        var employee = await _context.Employees
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (employee == null)
        {
            return NotFound(new { message = $"Employee with ID {id} was not found." });
        }

        // Validate DepartmentId
        var department = await _context.Departments.FindAsync(dto.DepartmentId);
        if (department == null)
        {
            return BadRequest(new { message = $"Department with ID {dto.DepartmentId} does not exist." });
        }

        // Validate unique email excluding current employee
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var emailExists = await _context.Employees
            .AnyAsync(e => e.Email.ToLower() == normalizedEmail && e.Id != id);

        if (emailExists)
        {
            return Conflict(new { message = $"Another employee with email '{dto.Email}' already exists." });
        }

        employee.FirstName = dto.FirstName.Trim();
        employee.LastName = dto.LastName.Trim();
        employee.Email = normalizedEmail;
        employee.Phone = dto.Phone?.Trim();
        employee.HireDate = dto.HireDate;
        employee.Salary = dto.Salary;
        employee.DepartmentId = dto.DepartmentId;
        employee.Status = dto.Status.Trim();
        employee.Department = department;

        await _context.SaveChangesAsync();

        return Ok(ToDto(employee));
    }

    /// <summary>
    /// DELETE /api/employees/{id}
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var employee = await _context.Employees.FindAsync(id);
        if (employee == null)
        {
            return NotFound(new { message = $"Employee with ID {id} was not found." });
        }

        _context.Employees.Remove(employee);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// POST /api/employees/bulk-create
    /// </summary>
    [HttpPost("bulk-create")]
    public async Task<ActionResult<BulkOperationResultDto>> BulkCreate([FromBody] BulkCreateEmployeeDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = new BulkOperationResultDto
        {
            TotalRequested = dto.Employees.Count
        };

        var departmentIds = dto.Employees.Select(e => e.DepartmentId).Distinct().ToList();
        var validDepartmentIds = (await _context.Departments
            .Where(d => departmentIds.Contains(d.Id))
            .Select(d => d.Id)
            .ToListAsync())
            .ToHashSet();

        var existingEmails = (await _context.Employees
            .Select(e => e.Email.ToLower())
            .ToListAsync())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var seenInBatchEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var employeesToInsert = new List<Employee>();

        for (int i = 0; i < dto.Employees.Count; i++)
        {
            var empDto = dto.Employees[i];
            int rowNum = i + 1;
            var normalizedEmail = empDto.Email.Trim().ToLowerInvariant();

            if (empDto.Salary <= 0)
            {
                result.Errors.Add($"Item {rowNum} ({empDto.Email}): Salary must be greater than 0.");
                result.FailureCount++;
                continue;
            }

            if (!validDepartmentIds.Contains(empDto.DepartmentId))
            {
                result.Errors.Add($"Item {rowNum} ({empDto.Email}): Department ID {empDto.DepartmentId} does not exist.");
                result.FailureCount++;
                continue;
            }

            if (existingEmails.Contains(normalizedEmail) || seenInBatchEmails.Contains(normalizedEmail))
            {
                result.Errors.Add($"Item {rowNum} ({empDto.Email}): Email '{empDto.Email}' is a duplicate.");
                result.FailureCount++;
                continue;
            }

            seenInBatchEmails.Add(normalizedEmail);
            employeesToInsert.Add(new Employee
            {
                FirstName = empDto.FirstName.Trim(),
                LastName = empDto.LastName.Trim(),
                Email = normalizedEmail,
                Phone = empDto.Phone?.Trim(),
                HireDate = empDto.HireDate,
                Salary = empDto.Salary,
                DepartmentId = empDto.DepartmentId,
                Status = empDto.Status.Trim()
            });
        }

        if (employeesToInsert.Count > 0)
        {
            await _context.Employees.AddRangeAsync(employeesToInsert);
            await _context.SaveChangesAsync();
            result.SuccessCount = employeesToInsert.Count;
        }

        return Ok(result);
    }

    /// <summary>
    /// POST /api/employees/bulk-delete
    /// </summary>
    [HttpPost("bulk-delete")]
    public async Task<ActionResult<BulkOperationResultDto>> BulkDelete([FromBody] BulkDeleteEmployeeDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var distinctIds = dto.EmployeeIds.Distinct().ToList();
        var result = new BulkOperationResultDto
        {
            TotalRequested = distinctIds.Count
        };

        var employeesToDelete = await _context.Employees
            .Where(e => distinctIds.Contains(e.Id))
            .ToListAsync();

        var foundIds = employeesToDelete.Select(e => e.Id).ToHashSet();
        var notFoundIds = distinctIds.Where(id => !foundIds.Contains(id)).ToList();

        foreach (var id in notFoundIds)
        {
            result.Errors.Add($"Employee with ID {id} was not found.");
            result.FailureCount++;
        }

        if (employeesToDelete.Count > 0)
        {
            _context.Employees.RemoveRange(employeesToDelete);
            await _context.SaveChangesAsync();
            result.SuccessCount = employeesToDelete.Count;
        }

        return Ok(result);
    }

    private static EmployeeResponseDto ToDto(Employee e) => new()
    {
        Id = e.Id,
        FirstName = e.FirstName,
        LastName = e.LastName,
        Email = e.Email,
        Phone = e.Phone,
        HireDate = e.HireDate,
        Salary = e.Salary,
        DepartmentId = e.DepartmentId,
        DepartmentName = e.Department?.Name,
        Status = e.Status
    };
}
