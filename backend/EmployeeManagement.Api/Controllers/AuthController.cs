using EmployeeManagement.Api.Data;
using EmployeeManagement.Api.DTOs;
using EmployeeManagement.Api.Models;
using EmployeeManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly AppDbContext _context;

    public AuthController(IAuthService authService, AppDbContext context)
    {
        _authService = authService;
        _context = context;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var user = await _authService.RegisterAsync(dto);

            // Automatically create employee profile when someone joins the company
            var existingEmp = await _context.Employees
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(e => e.Email.ToLower() == dto.Email.ToLower());

            if (existingEmp == null)
            {
                var nameParts = dto.Username.Trim().Split(' ', 2);
                var firstName = nameParts.Length > 0 && !string.IsNullOrWhiteSpace(nameParts[0]) ? nameParts[0] : "New";
                var lastName = nameParts.Length > 1 && !string.IsNullOrWhiteSpace(nameParts[1]) ? nameParts[1] : "Employee";

                var defaultDept = await _context.Departments.FirstOrDefaultAsync();

                var newEmp = new Employee
                {
                    FirstName = firstName,
                    LastName = lastName,
                    Email = dto.Email.Trim(),
                    DepartmentId = defaultDept?.Id ?? 1,
                    HireDate = DateTime.UtcNow.Date,
                    Salary = 450000m,
                    Status = EmployeeStatus.Active
                };
                _context.Employees.Add(newEmp);
                await _context.SaveChangesAsync();
            }

            return StatusCode(StatusCodes.Status201Created, user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var response = await _authService.LoginAsync(dto);
        if (response == null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        return Ok(response);
    }
}
