using System.ComponentModel.DataAnnotations;

namespace EmployeeManagement.Api.DTOs;

public class CreateEmployeeDto
{
    [Required(ErrorMessage = "First name is required.")]
    [MaxLength(100, ErrorMessage = "First name cannot exceed 100 characters.")]
    public string FirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Last name is required.")]
    [MaxLength(100, ErrorMessage = "Last name cannot exceed 100 characters.")]
    public string LastName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Invalid email address format.")]
    [MaxLength(150, ErrorMessage = "Email cannot exceed 150 characters.")]
    public string Email { get; set; } = string.Empty;

    [Phone(ErrorMessage = "Invalid phone number format.")]
    [MaxLength(20, ErrorMessage = "Phone number cannot exceed 20 characters.")]
    public string? Phone { get; set; }

    [Required(ErrorMessage = "Hire date is required.")]
    public DateTime HireDate { get; set; }

    [Range(0.01, 999999999.99, ErrorMessage = "Salary must be greater than 0.")]
    public decimal Salary { get; set; }

    [Required(ErrorMessage = "Department ID is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "A valid Department ID is required.")]
    public int DepartmentId { get; set; }

    [Required(ErrorMessage = "Status is required.")]
    [RegularExpression("^(Active|OnLeave|Terminated)$", ErrorMessage = "Status must be 'Active', 'OnLeave', or 'Terminated'.")]
    public string Status { get; set; } = "Active";
}

public class UpdateEmployeeDto
{
    [Required(ErrorMessage = "First name is required.")]
    [MaxLength(100, ErrorMessage = "First name cannot exceed 100 characters.")]
    public string FirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Last name is required.")]
    [MaxLength(100, ErrorMessage = "Last name cannot exceed 100 characters.")]
    public string LastName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Invalid email address format.")]
    [MaxLength(150, ErrorMessage = "Email cannot exceed 150 characters.")]
    public string Email { get; set; } = string.Empty;

    [Phone(ErrorMessage = "Invalid phone number format.")]
    [MaxLength(20, ErrorMessage = "Phone number cannot exceed 20 characters.")]
    public string? Phone { get; set; }

    [Required(ErrorMessage = "Hire date is required.")]
    public DateTime HireDate { get; set; }

    [Range(0.01, 999999999.99, ErrorMessage = "Salary must be greater than 0.")]
    public decimal Salary { get; set; }

    [Required(ErrorMessage = "Department ID is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "A valid Department ID is required.")]
    public int DepartmentId { get; set; }

    [Required(ErrorMessage = "Status is required.")]
    [RegularExpression("^(Active|OnLeave|Terminated)$", ErrorMessage = "Status must be 'Active', 'OnLeave', or 'Terminated'.")]
    public string Status { get; set; } = "Active";
}

public class EmployeeResponseDto
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}".Trim();
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public DateTime HireDate { get; set; }
    public decimal Salary { get; set; }
    public int DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string Status { get; set; } = "Active";
}

public class BulkCreateEmployeeDto
{
    [Required(ErrorMessage = "Employee list is required.")]
    [MinLength(1, ErrorMessage = "At least one employee must be provided.")]
    public List<CreateEmployeeDto> Employees { get; set; } = new();
}

public class BulkDeleteEmployeeDto
{
    [Required(ErrorMessage = "Employee IDs list is required.")]
    [MinLength(1, ErrorMessage = "At least one employee ID must be provided.")]
    public List<int> EmployeeIds { get; set; } = new();
}

public class BulkOperationResultDto
{
    public int TotalRequested { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public List<string> Errors { get; set; } = new();
}

public class PaginatedResultDto<T>
{
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
    public List<T> Items { get; set; } = new();
}
