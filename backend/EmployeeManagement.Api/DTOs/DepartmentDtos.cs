using System.ComponentModel.DataAnnotations;

namespace EmployeeManagement.Api.DTOs;

public class CreateDepartmentDto
{
    [Required(ErrorMessage = "Department name is required.")]
    [MaxLength(100, ErrorMessage = "Department name cannot exceed 100 characters.")]
    public string Name { get; set; } = string.Empty;

    [Range(0, 999999999.99, ErrorMessage = "Budget must be a non-negative number.")]
    public decimal Budget { get; set; }

    [MaxLength(150, ErrorMessage = "Location cannot exceed 150 characters.")]
    public string? Location { get; set; }
}

public class UpdateDepartmentDto
{
    [Required(ErrorMessage = "Department name is required.")]
    [MaxLength(100, ErrorMessage = "Department name cannot exceed 100 characters.")]
    public string Name { get; set; } = string.Empty;

    [Range(0, 999999999.99, ErrorMessage = "Budget must be a non-negative number.")]
    public decimal Budget { get; set; }

    [MaxLength(150, ErrorMessage = "Location cannot exceed 150 characters.")]
    public string? Location { get; set; }
}

public class DepartmentResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Budget { get; set; }
    public string? Location { get; set; }
    public int EmployeeCount { get; set; }
}
