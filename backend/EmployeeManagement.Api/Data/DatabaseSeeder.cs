using EmployeeManagement.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagement.Api.Data;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        // 1. Seed Admin User
        if (!await context.Users.AnyAsync(u => u.Email == "admin@example.com"))
        {
            var adminUser = new User
            {
                Username = "admin",
                Email = "admin@example.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                Role = "Admin",
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(adminUser);
            await context.SaveChangesAsync();
        }

        // 2. Seed 4 Departments
        if (!await context.Departments.AnyAsync())
        {
            var departments = new List<Department>
            {
                new() { Name = "Engineering", Budget = 500000m, Location = "Building A, Floor 3" },
                new() { Name = "Human Resources", Budget = 200000m, Location = "Building B, Floor 1" },
                new() { Name = "Marketing", Budget = 350000m, Location = "Building A, Floor 1" },
                new() { Name = "Finance", Budget = 400000m, Location = "Building B, Floor 2" }
            };

            context.Departments.AddRange(departments);
            await context.SaveChangesAsync();
        }

        var engineering = await context.Departments.FirstAsync(d => d.Name == "Engineering");
        var hr = await context.Departments.FirstAsync(d => d.Name == "Human Resources");
        var marketing = await context.Departments.FirstAsync(d => d.Name == "Marketing");
        var finance = await context.Departments.FirstAsync(d => d.Name == "Finance");

        // 3. Seed 20 Employees across the 4 departments
        if (!await context.Employees.AnyAsync())
        {
            var employees = new List<Employee>
            {
                // Engineering (8)
                new() { FirstName = "Alexander", LastName = "Wright", Email = "alexander.wright@example.com", Phone = "+1-555-0101", HireDate = new DateTime(2021, 3, 15), Salary = 115000m, DepartmentId = engineering.Id, Status = EmployeeStatus.Active },
                new() { FirstName = "Sophia", LastName = "Chen", Email = "sophia.chen@example.com", Phone = "+1-555-0102", HireDate = new DateTime(2021, 6, 1), Salary = 108000m, DepartmentId = engineering.Id, Status = EmployeeStatus.Active },
                new() { FirstName = "Marcus", LastName = "Johnson", Email = "marcus.johnson@example.com", Phone = "+1-555-0103", HireDate = new DateTime(2022, 1, 10), Salary = 95000m, DepartmentId = engineering.Id, Status = EmployeeStatus.Active },
                new() { FirstName = "Emily", LastName = "Davis", Email = "emily.davis@example.com", Phone = "+1-555-0104", HireDate = new DateTime(2022, 8, 22), Salary = 92000m, DepartmentId = engineering.Id, Status = EmployeeStatus.Active },
                new() { FirstName = "Liam", LastName = "Miller", Email = "liam.miller@example.com", Phone = "+1-555-0105", HireDate = new DateTime(2023, 2, 14), Salary = 86000m, DepartmentId = engineering.Id, Status = EmployeeStatus.Active },
                new() { FirstName = "Olivia", LastName = "Wilson", Email = "olivia.wilson@example.com", Phone = "+1-555-0106", HireDate = new DateTime(2023, 7, 19), Salary = 82000m, DepartmentId = engineering.Id, Status = EmployeeStatus.OnLeave },
                new() { FirstName = "Noah", LastName = "Anderson", Email = "noah.anderson@example.com", Phone = "+1-555-0107", HireDate = new DateTime(2024, 1, 8), Salary = 78000m, DepartmentId = engineering.Id, Status = EmployeeStatus.Active },
                new() { FirstName = "Ethan", LastName = "Taylor", Email = "ethan.taylor@example.com", Phone = "+1-555-0108", HireDate = new DateTime(2020, 11, 5), Salary = 125000m, DepartmentId = engineering.Id, Status = EmployeeStatus.Terminated },

                // Human Resources (3)
                new() { FirstName = "Sarah", LastName = "Jenkins", Email = "sarah.jenkins@example.com", Phone = "+1-555-0109", HireDate = new DateTime(2020, 4, 12), Salary = 88000m, DepartmentId = hr.Id, Status = EmployeeStatus.Active },
                new() { FirstName = "Daniel", LastName = "Martinez", Email = "daniel.martinez@example.com", Phone = "+1-555-0110", HireDate = new DateTime(2022, 5, 18), Salary = 65000m, DepartmentId = hr.Id, Status = EmployeeStatus.Active },
                new() { FirstName = "Chloe", LastName = "Robinson", Email = "chloe.robinson@example.com", Phone = "+1-555-0111", HireDate = new DateTime(2023, 9, 1), Salary = 58000m, DepartmentId = hr.Id, Status = EmployeeStatus.Active },

                // Marketing (5)
                new() { FirstName = "Benjamin", LastName = "Clark", Email = "benjamin.clark@example.com", Phone = "+1-555-0112", HireDate = new DateTime(2021, 9, 20), Salary = 92000m, DepartmentId = marketing.Id, Status = EmployeeStatus.Active },
                new() { FirstName = "Mia", LastName = "Rodriguez", Email = "mia.rodriguez@example.com", Phone = "+1-555-0113", HireDate = new DateTime(2022, 3, 11), Salary = 74000m, DepartmentId = marketing.Id, Status = EmployeeStatus.Active },
                new() { FirstName = "Lucas", LastName = "White", Email = "lucas.white@example.com", Phone = "+1-555-0114", HireDate = new DateTime(2023, 4, 15), Salary = 68000m, DepartmentId = marketing.Id, Status = EmployeeStatus.OnLeave },
                new() { FirstName = "Ava", LastName = "Hall", Email = "ava.hall@example.com", Phone = "+1-555-0115", HireDate = new DateTime(2023, 11, 28), Salary = 62000m, DepartmentId = marketing.Id, Status = EmployeeStatus.Active },
                new() { FirstName = "Henry", LastName = "Lewis", Email = "henry.lewis@example.com", Phone = "+1-555-0116", HireDate = new DateTime(2021, 1, 15), Salary = 80000m, DepartmentId = marketing.Id, Status = EmployeeStatus.Terminated },

                // Finance (4)
                new() { FirstName = "Grace", LastName = "Walker", Email = "grace.walker@example.com", Phone = "+1-555-0117", HireDate = new DateTime(2019, 8, 1), Salary = 105000m, DepartmentId = finance.Id, Status = EmployeeStatus.Active },
                new() { FirstName = "Samuel", LastName = "Young", Email = "samuel.young@example.com", Phone = "+1-555-0118", HireDate = new DateTime(2021, 10, 5), Salary = 84000m, DepartmentId = finance.Id, Status = EmployeeStatus.Active },
                new() { FirstName = "Ella", LastName = "Allen", Email = "ella.allen@example.com", Phone = "+1-555-0119", HireDate = new DateTime(2022, 12, 1), Salary = 72000m, DepartmentId = finance.Id, Status = EmployeeStatus.Active },
                new() { FirstName = "Jack", LastName = "King", Email = "jack.king@example.com", Phone = "+1-555-0120", HireDate = new DateTime(2024, 2, 20), Salary = 65000m, DepartmentId = finance.Id, Status = EmployeeStatus.Active }
            };

            context.Employees.AddRange(employees);
            await context.SaveChangesAsync();
        }

        // 4. Seed Attendance Records for Active Employees over recent business days
        if (!await context.Attendance.AnyAsync())
        {
            var activeEmployees = await context.Employees
                .Where(e => e.Status == EmployeeStatus.Active)
                .ToListAsync();

            var attendances = new List<Attendance>();
            var baseDate = DateTime.UtcNow.Date;

            for (int dayOffset = 5; dayOffset >= 1; dayOffset--)
            {
                var workDate = baseDate.AddDays(-dayOffset);
                if (workDate.DayOfWeek == DayOfWeek.Saturday || workDate.DayOfWeek == DayOfWeek.Sunday)
                    continue;

                int empIndex = 0;
                foreach (var emp in activeEmployees)
                {
                    empIndex++;
                    string status;
                    TimeSpan? checkIn = null;
                    TimeSpan? checkOut = null;

                    if ((empIndex + dayOffset) % 11 == 0)
                    {
                        status = AttendanceStatus.Absent;
                    }
                    else if ((empIndex + dayOffset) % 7 == 0)
                    {
                        status = AttendanceStatus.Late;
                        checkIn = new TimeSpan(9, 30 + (empIndex % 15), 0);
                        checkOut = new TimeSpan(17, 30, 0);
                    }
                    else if ((empIndex + dayOffset) % 13 == 0)
                    {
                        status = AttendanceStatus.Excused;
                    }
                    else
                    {
                        status = AttendanceStatus.Present;
                        checkIn = new TimeSpan(8, 45 + (empIndex % 20), 0);
                        checkOut = new TimeSpan(17, 15 + (empIndex % 30), 0);
                    }

                    attendances.Add(new Attendance
                    {
                        EmployeeId = emp.Id,
                        Date = workDate,
                        Status = status,
                        CheckInTime = checkIn,
                        CheckOutTime = checkOut
                    });
                }
            }

            if (attendances.Count > 0)
            {
                context.Attendance.AddRange(attendances);
                await context.SaveChangesAsync();
            }
        }

        // 5. Ensure Modern Software Office Departments and Facilities Setup
        await EnsureSoftwareOfficeSetupAsync(context);
    }

    public static async Task EnsureSoftwareOfficeSetupAsync(AppDbContext context)
    {
        // 1. Rename 'Engineering' to 'Software Development' and configure facilities
        var engineering = await context.Departments.FirstOrDefaultAsync(d => d.Name == "Engineering");
        if (engineering != null)
        {
            engineering.Name = "Software Development";
            engineering.Location = "Development Bay - Floor 2";
            engineering.Facilities = "Dual Monitors, Dev Sandbox, GitHub CI/CD, Cloud Workstations";
            engineering.Budget = 1200000m;
        }

        // 2. Configure 'Human Resources' with software office HR facilities
        var hr = await context.Departments.FirstOrDefaultAsync(d => d.Name == "Human Resources" || d.Name == "Human Resources (HR)");
        if (hr != null)
        {
            hr.Name = "Human Resources (HR)";
            hr.Location = "HR Suite - Floor 1";
            hr.Facilities = "HRMS Portal, Onboarding Hub, Biometric Access, Interview Suites";
            hr.Budget = 350000m;
        }
        else
        {
            hr = new Department
            {
                Name = "Human Resources (HR)",
                Location = "HR Suite - Floor 1",
                Facilities = "HRMS Portal, Onboarding Hub, Biometric Access, Interview Suites",
                Budget = 350000m
            };
            context.Departments.Add(hr);
        }

        // 3. Ensure Quality Assurance (QA)
        var qa = await context.Departments.FirstOrDefaultAsync(d => d.Name == "Quality Assurance (QA)" || d.Name == "Marketing");
        if (qa != null)
        {
            qa.Name = "Quality Assurance (QA)";
            qa.Location = "QA Test Lab - Floor 2";
            qa.Facilities = "Mobile Test Devices, Automated Test Rig, Bug Tracking Hub";
            qa.Budget = 450000m;
        }
        else
        {
            qa = new Department
            {
                Name = "Quality Assurance (QA)",
                Location = "QA Test Lab - Floor 2",
                Facilities = "Mobile Test Devices, Automated Test Rig, Bug Tracking Hub",
                Budget = 450000m
            };
            context.Departments.Add(qa);
        }

        // 4. Ensure DevOps & Cloud Infrastructure
        var devops = await context.Departments.FirstOrDefaultAsync(d => d.Name == "DevOps & Cloud Infrastructure" || d.Name == "Finance");
        if (devops != null)
        {
            devops.Name = "DevOps & Cloud Infrastructure";
            devops.Location = "Server Wing - Floor 3";
            devops.Facilities = "AWS/Azure Cloud Console, VPN Gateway, Kubernetes Cluster";
            devops.Budget = 600000m;
        }
        else
        {
            devops = new Department
            {
                Name = "DevOps & Cloud Infrastructure",
                Location = "Server Wing - Floor 3",
                Facilities = "AWS/Azure Cloud Console, VPN Gateway, Kubernetes Cluster",
                Budget = 600000m
            };
            context.Departments.Add(devops);
        }

        // 5. Ensure UI/UX & Product Design
        if (!await context.Departments.AnyAsync(d => d.Name == "UI/UX & Product Design"))
        {
            context.Departments.Add(new Department
            {
                Name = "UI/UX & Product Design",
                Location = "Creative Studio - Floor 1",
                Facilities = "4K Color-Accurate Displays, Figma Enterprise, Design Library",
                Budget = 400000m
            });
        }

        // 6. Ensure IT Support & Office Facilities
        if (!await context.Departments.AnyAsync(d => d.Name == "IT Support & Office Facilities"))
        {
            context.Departments.Add(new Department
            {
                Name = "IT Support & Office Facilities",
                Location = "Helpdesk - Ground Floor",
                Facilities = "Workstation Provisioning, Hardware Asset Depot, Gigabit LAN",
                Budget = 300000m
            });
        }

        await context.SaveChangesAsync();

        // 7. Ensure employees are allocated across HR and Software Development
        var hrDept = await context.Departments.FirstOrDefaultAsync(d => d.Name.Contains("Human Resources"));
        var qaDept = await context.Departments.FirstOrDefaultAsync(d => d.Name.Contains("Quality Assurance"));

        if (hrDept != null)
        {
            var sahithi = await context.Employees.FirstOrDefaultAsync(e => e.FirstName.ToLower().Contains("sahithi"));
            if (sahithi != null && sahithi.DepartmentId != hrDept.Id)
            {
                sahithi.DepartmentId = hrDept.Id;
            }

            var parusu = await context.Employees.FirstOrDefaultAsync(e => e.FirstName.ToLower().Contains("parusu"));
            if (parusu != null && parusu.DepartmentId != hrDept.Id)
            {
                parusu.DepartmentId = hrDept.Id;
            }
        }

        if (qaDept != null)
        {
            var deepika = await context.Employees.FirstOrDefaultAsync(e => e.FirstName.ToLower().Contains("deepika"));
            if (deepika != null && deepika.DepartmentId != qaDept.Id)
            {
                deepika.DepartmentId = qaDept.Id;
            }
        }

        await context.SaveChangesAsync();
    }
}
