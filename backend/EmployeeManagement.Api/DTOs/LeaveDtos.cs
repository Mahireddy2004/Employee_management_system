using System.ComponentModel.DataAnnotations;

namespace EmployeeManagement.Api.DTOs;

public class CreateLeaveRequestDto
{
    public int? EmployeeId { get; set; }

    [Required(ErrorMessage = "Leave type is required.")]
    [MaxLength(50)]
    public string LeaveType { get; set; } = "Casual";

    [Required(ErrorMessage = "Start date is required.")]
    public DateTime StartDate { get; set; }

    [Required(ErrorMessage = "End date is required.")]
    public DateTime EndDate { get; set; }

    [Required(ErrorMessage = "Reason is required.")]
    [MaxLength(500, ErrorMessage = "Reason cannot exceed 500 characters.")]
    public string Reason { get; set; } = string.Empty;
}

public class UpdateLeaveStatusDto
{
    [Required]
    [RegularExpression("^(Approved|Rejected|Cancelled)$", ErrorMessage = "Status must be 'Approved', 'Rejected', or 'Cancelled'.")]
    public string Status { get; set; } = "Approved";

    [MaxLength(500)]
    public string? AdminNotes { get; set; }
}

public class LeaveResponseDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string EmployeeEmail { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string LeaveType { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TotalDays { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? AdminNotes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public string? ProcessedBy { get; set; }
}

public class LeaveSummaryDto
{
    public int TotalRequests { get; set; }
    public int PendingRequests { get; set; }
    public int ApprovedRequests { get; set; }
    public int RejectedRequests { get; set; }
    public int CasualLeaveBalance { get; set; } = 12;
    public int SickLeaveBalance { get; set; } = 10;
    public int AnnualLeaveBalance { get; set; } = 15;
}
