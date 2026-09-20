using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace EmployeeManagement.Api.Models;

public static class EmployeeStatus
{
    public const string Active = "Active";
    public const string OnLeave = "OnLeave";
    public const string Terminated = "Terminated";
}

public class Employee
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Phone { get; set; }

    [Required]
    public DateTime HireDate { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Salary { get; set; }

    [Required]
    public int DepartmentId { get; set; }

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = EmployeeStatus.Active;

    // Navigation property: Department
    [ForeignKey(nameof(DepartmentId))]
    public Department? Department { get; set; }

    // Navigation property: Employee 1 -> many Attendance records
    [JsonIgnore]
    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
}
