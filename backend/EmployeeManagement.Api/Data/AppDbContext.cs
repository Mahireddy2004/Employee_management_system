using EmployeeManagement.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagement.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Attendance> Attendance => Set<Attendance>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User Configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Username).IsRequired().HasMaxLength(100);
            entity.Property(u => u.Email).IsRequired().HasMaxLength(150);
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.Role).IsRequired().HasMaxLength(50);

            // Index: User Email (Unique)
            entity.HasIndex(u => u.Email)
                  .IsUnique()
                  .HasDatabaseName("IX_Users_Email");
        });

        // Department Configuration
        modelBuilder.Entity<Department>(entity =>
        {
            entity.HasKey(d => d.Id);
            entity.Property(d => d.Name).IsRequired().HasMaxLength(100);
            entity.Property(d => d.Budget).HasPrecision(18, 2);
            entity.Property(d => d.Location).HasMaxLength(150);
            entity.Property(d => d.Facilities).HasMaxLength(255);

            // Relationship: Department 1 -> Many Employees
            entity.HasMany(d => d.Employees)
                  .WithOne(e => e.Department)
                  .HasForeignKey(e => e.DepartmentId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Employee Configuration
        modelBuilder.Entity<Employee>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.LastName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(150);
            entity.Property(e => e.Phone).HasMaxLength(20);
            entity.Property(e => e.HireDate).IsRequired();
            entity.Property(e => e.Salary).HasPrecision(18, 2);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(20);
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);

            // Global Query Filter: Exclude soft-deleted employees automatically
            entity.HasQueryFilter(e => !e.IsDeleted);

            // Index: Employee Email (Unique)
            entity.HasIndex(e => e.Email)
                  .IsUnique()
                  .HasDatabaseName("IX_Employees_Email");

            // Index: Employee DepartmentId
            entity.HasIndex(e => e.DepartmentId)
                  .HasDatabaseName("IX_Employees_DepartmentId");

            // Index: Employee IsDeleted
            entity.HasIndex(e => e.IsDeleted)
                  .HasDatabaseName("IX_Employees_IsDeleted");

            // Relationship: Employee 1 -> Many Attendance records
            entity.HasMany(e => e.Attendances)
                  .WithOne(a => a.Employee)
                  .HasForeignKey(a => a.EmployeeId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Attendance Configuration
        modelBuilder.Entity<Attendance>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Date).IsRequired();
            entity.Property(a => a.Status).IsRequired().HasMaxLength(20);

            // Index: Attendance EmployeeId
            entity.HasIndex(a => a.EmployeeId)
                  .HasDatabaseName("IX_Attendance_EmployeeId");

            // Index: Attendance Date
            entity.HasIndex(a => a.Date)
                  .HasDatabaseName("IX_Attendance_Date");

            // Composite Unique Index: Prevent duplicate attendance records for the same employee on the same date
            entity.HasIndex(a => new { a.EmployeeId, a.Date })
                  .IsUnique()
                  .HasDatabaseName("IX_Attendance_EmployeeId_Date");

            // Global Query Filter: Automatically filter attendance of soft-deleted employees
            entity.HasQueryFilter(a => !a.Employee!.IsDeleted);
        });

        // LeaveRequest Configuration
        modelBuilder.Entity<LeaveRequest>(entity =>
        {
            entity.HasKey(l => l.Id);
            entity.Property(l => l.LeaveType).IsRequired().HasMaxLength(50);
            entity.Property(l => l.Status).IsRequired().HasMaxLength(20);
            entity.Property(l => l.Reason).IsRequired().HasMaxLength(500);
            entity.Property(l => l.AdminNotes).HasMaxLength(500);
            entity.Property(l => l.ProcessedBy).HasMaxLength(100);

            // Index: EmployeeId
            entity.HasIndex(l => l.EmployeeId)
                  .HasDatabaseName("IX_LeaveRequests_EmployeeId");

            // Index: Status
            entity.HasIndex(l => l.Status)
                  .HasDatabaseName("IX_LeaveRequests_Status");

            // Global Query Filter: Filter out leave requests for soft-deleted employees
            entity.HasQueryFilter(l => !l.Employee!.IsDeleted);

            // Relationship
            entity.HasOne(l => l.Employee)
                  .WithMany(e => e.LeaveRequests)
                  .HasForeignKey(l => l.EmployeeId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateAuditTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        UpdateAuditTimestamps();
        return base.SaveChanges();
    }

    private void UpdateAuditTimestamps()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.Entity is Employee && (e.State == EntityState.Added || e.State == EntityState.Modified));

        foreach (var entry in entries)
        {
            if (entry.Entity is Employee emp)
            {
                if (entry.State == EntityState.Added)
                {
                    if (emp.CreatedAt == default)
                    {
                        emp.CreatedAt = DateTime.UtcNow;
                    }
                }
                else if (entry.State == EntityState.Modified)
                {
                    emp.UpdatedAt = DateTime.UtcNow;
                }
            }
        }
    }
}
