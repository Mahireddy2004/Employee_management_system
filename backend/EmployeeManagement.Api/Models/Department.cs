using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace EmployeeManagement.Api.Models;

public class Department
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal Budget { get; set; }

    [MaxLength(150)]
    public string? Location { get; set; }

    // Navigation property: Department 1 -> many Employees
    [JsonIgnore]
    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
}
