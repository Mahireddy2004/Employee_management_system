using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagement.Api.Models;

public static class LeaveStatus
{
    public const string Pending = "Pending";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";
    public const string Cancelled = "Cancelled";
}

public static class LeaveType
{
    public const string Casual = "Casual";
    public const string Sick = "Sick";
    public const string Annual = "Annual";
    public const string Maternity = "Maternity/Paternity";
    public const string Unpaid = "Unpaid";
}

public class LeaveRequest
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int EmployeeId { get; set; }

    [Required]
    [MaxLength(50)]
    public string LeaveType { get; set; } = Models.LeaveType.Casual;

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime EndDate { get; set; }

    public int TotalDays { get; set; }

    [Required]
    [MaxLength(500)]
    public string Reason { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = LeaveStatus.Pending;

    [MaxLength(500)]
    public string? AdminNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ProcessedAt { get; set; }

    [MaxLength(100)]
    public string? ProcessedBy { get; set; }

    // Navigation property
    [ForeignKey(nameof(EmployeeId))]
    public Employee? Employee { get; set; }
}
