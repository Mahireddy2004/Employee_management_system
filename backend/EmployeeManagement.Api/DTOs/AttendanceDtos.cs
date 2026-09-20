using System.ComponentModel.DataAnnotations;

namespace EmployeeManagement.Api.DTOs;

public class CreateAttendanceDto
{
    [Required(ErrorMessage = "Employee ID is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "A valid Employee ID is required.")]
    public int EmployeeId { get; set; }

    [Required(ErrorMessage = "Date is required.")]
    public DateTime Date { get; set; }

    [Required(ErrorMessage = "Status is required.")]
    [RegularExpression("^(Present|Absent|Late|Excused)$", ErrorMessage = "Status must be 'Present', 'Absent', 'Late', or 'Excused'.")]
    public string Status { get; set; } = "Present";

    public TimeSpan? CheckInTime { get; set; }

    public TimeSpan? CheckOutTime { get; set; }
}

public class UpdateAttendanceDto
{
    [Required(ErrorMessage = "Date is required.")]
    public DateTime Date { get; set; }

    [Required(ErrorMessage = "Status is required.")]
    [RegularExpression("^(Present|Absent|Late|Excused)$", ErrorMessage = "Status must be 'Present', 'Absent', 'Late', or 'Excused'.")]
    public string Status { get; set; } = "Present";

    public TimeSpan? CheckInTime { get; set; }

    public TimeSpan? CheckOutTime { get; set; }
}

public class AttendanceResponseDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string? EmployeeName { get; set; }
    public string? EmployeeEmail { get; set; }
    public DateTime Date { get; set; }
    public string Status { get; set; } = "Present";
    public TimeSpan? CheckInTime { get; set; }
    public TimeSpan? CheckOutTime { get; set; }
}
