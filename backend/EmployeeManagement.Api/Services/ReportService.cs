using ClosedXML.Excel;
using EmployeeManagement.Api.Data;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EmployeeManagement.Api.Services;

public class ReportService : IReportService
{
    private readonly AppDbContext _context;

    static ReportService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public ReportService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<byte[]> GenerateExcelReportAsync(string reportType)
    {
        return reportType.Trim().ToLowerInvariant() switch
        {
            "employees" => await GenerateEmployeesExcelAsync(),
            "attendance" => await GenerateAttendanceExcelAsync(),
            "payroll" => await GeneratePayrollExcelAsync(),
            _ => throw new ArgumentException($"Invalid report type '{reportType}'. Supported types are: 'employees', 'attendance', 'payroll'.", nameof(reportType))
        };
    }

    public async Task<byte[]> GeneratePdfReportAsync(string reportType)
    {
        return reportType.Trim().ToLowerInvariant() switch
        {
            "employees" => await GenerateEmployeesPdfAsync(),
            "attendance" => await GenerateAttendancePdfAsync(),
            "payroll" => await GeneratePayrollPdfAsync(),
            _ => throw new ArgumentException($"Invalid report type '{reportType}'. Supported types are: 'employees', 'attendance', 'payroll'.", nameof(reportType))
        };
    }

    #region Excel Generators

    private async Task<byte[]> GenerateEmployeesExcelAsync()
    {
        var employees = await _context.Employees
            .Include(e => e.Department)
            .AsNoTracking()
            .OrderBy(e => e.Id)
            .ToListAsync();

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Employees");

        // Headers
        string[] headers = { "ID", "First Name", "Last Name", "Email", "Phone", "Department", "Hire Date", "Salary ($)", "Status" };
        for (int i = 0; i < headers.Length; i++)
        {
            ws.Cell(1, i + 1).Value = headers[i];
        }

        // Header Styling
        var headerRange = ws.Range(1, 1, 1, headers.Length);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Font.FontColor = XLColor.White;
        headerRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#1E3A8A");
        headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        // Data Rows
        int row = 2;
        foreach (var emp in employees)
        {
            ws.Cell(row, 1).Value = emp.Id;
            ws.Cell(row, 2).Value = emp.FirstName;
            ws.Cell(row, 3).Value = emp.LastName;
            ws.Cell(row, 4).Value = emp.Email;
            ws.Cell(row, 5).Value = emp.Phone ?? "-";
            ws.Cell(row, 6).Value = emp.Department?.Name ?? "-";
            ws.Cell(row, 7).Value = emp.HireDate.ToString("yyyy-MM-dd");
            ws.Cell(row, 8).Value = emp.Salary;
            ws.Cell(row, 8).Style.NumberFormat.Format = "$#,##0.00";
            ws.Cell(row, 9).Value = emp.Status;

            // Zebra striping
            if (row % 2 == 1)
            {
                ws.Range(row, 1, row, headers.Length).Style.Fill.BackgroundColor = XLColor.FromHtml("#F8FAFC");
            }
            row++;
        }

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private async Task<byte[]> GenerateAttendanceExcelAsync()
    {
        var attendances = await _context.Attendance
            .Include(a => a.Employee)
            .AsNoTracking()
            .OrderByDescending(a => a.Date)
            .ThenBy(a => a.EmployeeId)
            .ToListAsync();

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Attendance");

        // Headers
        string[] headers = { "ID", "Employee ID", "Employee Name", "Email", "Date", "Status", "Check-In Time", "Check-Out Time" };
        for (int i = 0; i < headers.Length; i++)
        {
            ws.Cell(1, i + 1).Value = headers[i];
        }

        // Header Styling
        var headerRange = ws.Range(1, 1, 1, headers.Length);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Font.FontColor = XLColor.White;
        headerRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#0F766E");
        headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        // Data Rows
        int row = 2;
        foreach (var att in attendances)
        {
            var empName = att.Employee != null ? $"{att.Employee.FirstName} {att.Employee.LastName}".Trim() : "-";
            ws.Cell(row, 1).Value = att.Id;
            ws.Cell(row, 2).Value = att.EmployeeId;
            ws.Cell(row, 3).Value = empName;
            ws.Cell(row, 4).Value = att.Employee?.Email ?? "-";
            ws.Cell(row, 5).Value = att.Date.ToString("yyyy-MM-dd");
            ws.Cell(row, 6).Value = att.Status;
            ws.Cell(row, 7).Value = att.CheckInTime.HasValue ? att.CheckInTime.Value.ToString(@"hh\:mm\:ss") : "-";
            ws.Cell(row, 8).Value = att.CheckOutTime.HasValue ? att.CheckOutTime.Value.ToString(@"hh\:mm\:ss") : "-";

            if (row % 2 == 1)
            {
                ws.Range(row, 1, row, headers.Length).Style.Fill.BackgroundColor = XLColor.FromHtml("#F0FDFA");
            }
            row++;
        }

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private async Task<byte[]> GeneratePayrollExcelAsync()
    {
        var employees = await _context.Employees
            .Include(e => e.Department)
            .Where(e => e.Status == "Active")
            .AsNoTracking()
            .OrderBy(e => e.DepartmentId)
            .ThenBy(e => e.Id)
            .ToListAsync();

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Payroll");

        // Headers
        string[] headers = { "Employee ID", "Employee Name", "Department", "Annual Salary ($)", "Monthly Gross ($)", "Est. Tax (15%) ($)", "Net Monthly ($)" };
        for (int i = 0; i < headers.Length; i++)
        {
            ws.Cell(1, i + 1).Value = headers[i];
        }

        // Header Styling
        var headerRange = ws.Range(1, 1, 1, headers.Length);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Font.FontColor = XLColor.White;
        headerRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#166534");
        headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        int row = 2;
        decimal totalAnnual = 0;
        decimal totalMonthlyGross = 0;
        decimal totalTax = 0;
        decimal totalNet = 0;

        foreach (var emp in employees)
        {
            var monthlyGross = Math.Round(emp.Salary / 12m, 2);
            var tax = Math.Round(monthlyGross * 0.15m, 2);
            var netMonthly = monthlyGross - tax;

            totalAnnual += emp.Salary;
            totalMonthlyGross += monthlyGross;
            totalTax += tax;
            totalNet += netMonthly;

            ws.Cell(row, 1).Value = emp.Id;
            ws.Cell(row, 2).Value = $"{emp.FirstName} {emp.LastName}".Trim();
            ws.Cell(row, 3).Value = emp.Department?.Name ?? "-";
            ws.Cell(row, 4).Value = emp.Salary;
            ws.Cell(row, 5).Value = monthlyGross;
            ws.Cell(row, 6).Value = tax;
            ws.Cell(row, 7).Value = netMonthly;

            for (int col = 4; col <= 7; col++)
            {
                ws.Cell(row, col).Style.NumberFormat.Format = "$#,##0.00";
            }

            if (row % 2 == 1)
            {
                ws.Range(row, 1, row, headers.Length).Style.Fill.BackgroundColor = XLColor.FromHtml("#F0FDF4");
            }
            row++;
        }

        // Totals Row
        ws.Cell(row, 1).Value = "TOTALS";
        ws.Range(row, 1, row, 3).Merge();
        ws.Cell(row, 1).Style.Font.Bold = true;
        ws.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

        ws.Cell(row, 4).Value = totalAnnual;
        ws.Cell(row, 5).Value = totalMonthlyGross;
        ws.Cell(row, 6).Value = totalTax;
        ws.Cell(row, 7).Value = totalNet;

        for (int col = 4; col <= 7; col++)
        {
            ws.Cell(row, col).Style.NumberFormat.Format = "$#,##0.00";
            ws.Cell(row, col).Style.Font.Bold = true;
        }

        var totalRowRange = ws.Range(row, 1, row, headers.Length);
        totalRowRange.Style.Border.TopBorder = XLBorderStyleValues.Thin;
        totalRowRange.Style.Border.BottomBorder = XLBorderStyleValues.Double;
        totalRowRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#DCFCE7");

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    #endregion

    #region PDF Generators

    private async Task<byte[]> GenerateEmployeesPdfAsync()
    {
        var employees = await _context.Employees
            .Include(e => e.Department)
            .AsNoTracking()
            .OrderBy(e => e.Id)
            .ToListAsync();

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(1.5f, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(9));

                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Employee Management System").FontSize(16).Bold().FontColor(Colors.Blue.Darken3);
                            c.Item().Text("Comprehensive Employee Directory Report").FontSize(11).FontColor(Colors.Grey.Darken1);
                        });
                        row.ConstantItem(150).AlignRight().Column(c =>
                        {
                            c.Item().Text($"Date: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC").FontSize(8).FontColor(Colors.Grey.Darken1);
                            c.Item().Text($"Total Records: {employees.Count}").FontSize(8).Bold();
                        });
                    });
                    col.Item().PaddingTop(5).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                });

                page.Content().PaddingTop(10).Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.ConstantColumn(30);  // ID
                        columns.RelativeColumn(2);   // Name
                        columns.RelativeColumn(3);   // Email
                        columns.RelativeColumn(2);   // Phone
                        columns.RelativeColumn(2);   // Department
                        columns.ConstantColumn(65);  // Hire Date
                        columns.ConstantColumn(70);  // Salary
                        columns.ConstantColumn(55);  // Status
                    });

                    table.Header(header =>
                    {
                        header.Cell().Element(PdfHeaderStyle).Text("ID").Bold().FontColor(Colors.White);
                        header.Cell().Element(PdfHeaderStyle).Text("Name").Bold().FontColor(Colors.White);
                        header.Cell().Element(PdfHeaderStyle).Text("Email").Bold().FontColor(Colors.White);
                        header.Cell().Element(PdfHeaderStyle).Text("Phone").Bold().FontColor(Colors.White);
                        header.Cell().Element(PdfHeaderStyle).Text("Department").Bold().FontColor(Colors.White);
                        header.Cell().Element(PdfHeaderStyle).Text("Hire Date").Bold().FontColor(Colors.White);
                        header.Cell().Element(PdfHeaderStyle).AlignRight().Text("Salary").Bold().FontColor(Colors.White);
                        header.Cell().Element(PdfHeaderStyle).AlignCenter().Text("Status").Bold().FontColor(Colors.White);
                    });

                    uint index = 0;
                    foreach (var emp in employees)
                    {
                        var isEven = index % 2 == 0;
                        IContainer CellFormat(IContainer c) => PdfRowStyle(c, isEven);

                        table.Cell().Element(CellFormat).Text(emp.Id.ToString());
                        table.Cell().Element(CellFormat).Text($"{emp.FirstName} {emp.LastName}");
                        table.Cell().Element(CellFormat).Text(emp.Email);
                        table.Cell().Element(CellFormat).Text(emp.Phone ?? "-");
                        table.Cell().Element(CellFormat).Text(emp.Department?.Name ?? "-");
                        table.Cell().Element(CellFormat).Text(emp.HireDate.ToString("yyyy-MM-dd"));
                        table.Cell().Element(CellFormat).AlignRight().Text($"${emp.Salary:N2}");
                        table.Cell().Element(CellFormat).AlignCenter().Text(emp.Status);
                        index++;
                    }
                });

                page.Footer().AlignCenter().Text(x =>
                {
                    x.Span("Page ");
                    x.CurrentPageNumber();
                    x.Span(" of ");
                    x.TotalPages();
                });
            });
        });

        return document.GeneratePdf();
    }

    private async Task<byte[]> GenerateAttendancePdfAsync()
    {
        var attendances = await _context.Attendance
            .Include(a => a.Employee)
            .AsNoTracking()
            .OrderByDescending(a => a.Date)
            .ThenBy(a => a.EmployeeId)
            .ToListAsync();

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(1.5f, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(9));

                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Employee Management System").FontSize(16).Bold().FontColor(Colors.Teal.Darken3);
                            c.Item().Text("Daily Attendance Activity Log").FontSize(11).FontColor(Colors.Grey.Darken1);
                        });
                        row.ConstantItem(150).AlignRight().Column(c =>
                        {
                            c.Item().Text($"Date: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC").FontSize(8).FontColor(Colors.Grey.Darken1);
                            c.Item().Text($"Total Entries: {attendances.Count}").FontSize(8).Bold();
                        });
                    });
                    col.Item().PaddingTop(5).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                });

                page.Content().PaddingTop(10).Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.ConstantColumn(30); // ID
                        columns.RelativeColumn(3);  // Employee Name
                        columns.ConstantColumn(75); // Date
                        columns.ConstantColumn(60); // Status
                        columns.ConstantColumn(70); // Check-In
                        columns.ConstantColumn(70); // Check-Out
                    });

                    table.Header(header =>
                    {
                        header.Cell().Element(PdfTealHeaderStyle).Text("ID").Bold().FontColor(Colors.White);
                        header.Cell().Element(PdfTealHeaderStyle).Text("Employee").Bold().FontColor(Colors.White);
                        header.Cell().Element(PdfTealHeaderStyle).Text("Date").Bold().FontColor(Colors.White);
                        header.Cell().Element(PdfTealHeaderStyle).AlignCenter().Text("Status").Bold().FontColor(Colors.White);
                        header.Cell().Element(PdfTealHeaderStyle).AlignCenter().Text("Check-In").Bold().FontColor(Colors.White);
                        header.Cell().Element(PdfTealHeaderStyle).AlignCenter().Text("Check-Out").Bold().FontColor(Colors.White);
                    });

                    uint index = 0;
                    foreach (var att in attendances)
                    {
                        var isEven = index % 2 == 0;
                        IContainer CellFormat(IContainer c) => PdfRowStyle(c, isEven);

                        var empName = att.Employee != null ? $"{att.Employee.FirstName} {att.Employee.LastName}".Trim() : "-";
                        table.Cell().Element(CellFormat).Text(att.Id.ToString());
                        table.Cell().Element(CellFormat).Text(empName);
                        table.Cell().Element(CellFormat).Text(att.Date.ToString("yyyy-MM-dd"));
                        table.Cell().Element(CellFormat).AlignCenter().Text(att.Status);
                        table.Cell().Element(CellFormat).AlignCenter().Text(att.CheckInTime.HasValue ? att.CheckInTime.Value.ToString(@"hh\:mm\:ss") : "-");
                        table.Cell().Element(CellFormat).AlignCenter().Text(att.CheckOutTime.HasValue ? att.CheckOutTime.Value.ToString(@"hh\:mm\:ss") : "-");
                        index++;
                    }
                });

                page.Footer().AlignCenter().Text(x =>
                {
                    x.Span("Page ");
                    x.CurrentPageNumber();
                    x.Span(" of ");
                    x.TotalPages();
                });
            });
        });

        return document.GeneratePdf();
    }

    private async Task<byte[]> GeneratePayrollPdfAsync()
    {
        var employees = await _context.Employees
            .Include(e => e.Department)
            .Where(e => e.Status == "Active")
            .AsNoTracking()
            .OrderBy(e => e.DepartmentId)
            .ThenBy(e => e.Id)
            .ToListAsync();

        decimal totalAnnual = employees.Sum(e => e.Salary);
        decimal totalMonthlyGross = Math.Round(totalAnnual / 12m, 2);
        decimal totalTax = Math.Round(totalMonthlyGross * 0.15m, 2);
        decimal totalNet = totalMonthlyGross - totalTax;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(1.5f, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(9));

                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Employee Management System").FontSize(16).Bold().FontColor(Colors.Green.Darken3);
                            c.Item().Text("Payroll & Compensation Summary Report").FontSize(11).FontColor(Colors.Grey.Darken1);
                        });
                        row.ConstantItem(150).AlignRight().Column(c =>
                        {
                            c.Item().Text($"Date: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC").FontSize(8).FontColor(Colors.Grey.Darken1);
                            c.Item().Text($"Active Employees: {employees.Count}").FontSize(8).Bold();
                        });
                    });
                    col.Item().PaddingTop(5).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                });

                page.Content().PaddingTop(10).Column(col =>
                {
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(40); // ID
                            columns.RelativeColumn(3);  // Name
                            columns.RelativeColumn(2);  // Department
                            columns.RelativeColumn(2);  // Annual Salary
                            columns.RelativeColumn(2);  // Monthly Gross
                            columns.RelativeColumn(2);  // Tax (15%)
                            columns.RelativeColumn(2);  // Net Monthly
                        });

                        table.Header(header =>
                        {
                            header.Cell().Element(PdfGreenHeaderStyle).Text("ID").Bold().FontColor(Colors.White);
                            header.Cell().Element(PdfGreenHeaderStyle).Text("Employee").Bold().FontColor(Colors.White);
                            header.Cell().Element(PdfGreenHeaderStyle).Text("Department").Bold().FontColor(Colors.White);
                            header.Cell().Element(PdfGreenHeaderStyle).AlignRight().Text("Annual Salary").Bold().FontColor(Colors.White);
                            header.Cell().Element(PdfGreenHeaderStyle).AlignRight().Text("Monthly Gross").Bold().FontColor(Colors.White);
                            header.Cell().Element(PdfGreenHeaderStyle).AlignRight().Text("Tax (15%)").Bold().FontColor(Colors.White);
                            header.Cell().Element(PdfGreenHeaderStyle).AlignRight().Text("Net Monthly").Bold().FontColor(Colors.White);
                        });

                        uint index = 0;
                        foreach (var emp in employees)
                        {
                            var isEven = index % 2 == 0;
                            IContainer CellFormat(IContainer c) => PdfRowStyle(c, isEven);

                            var monthlyGross = Math.Round(emp.Salary / 12m, 2);
                            var tax = Math.Round(monthlyGross * 0.15m, 2);
                            var netMonthly = monthlyGross - tax;

                            table.Cell().Element(CellFormat).Text(emp.Id.ToString());
                            table.Cell().Element(CellFormat).Text($"{emp.FirstName} {emp.LastName}");
                            table.Cell().Element(CellFormat).Text(emp.Department?.Name ?? "-");
                            table.Cell().Element(CellFormat).AlignRight().Text($"${emp.Salary:N2}");
                            table.Cell().Element(CellFormat).AlignRight().Text($"${monthlyGross:N2}");
                            table.Cell().Element(CellFormat).AlignRight().Text($"${tax:N2}");
                            table.Cell().Element(CellFormat).AlignRight().Text($"${netMonthly:N2}");
                            index++;
                        }
                    });

                    // Summary Block
                    col.Item().PaddingTop(15).AlignRight().Border(1).BorderColor(Colors.Grey.Lighten1).Padding(10).Column(sc =>
                    {
                        sc.Item().Text("Payroll Grand Totals").FontSize(11).Bold().FontColor(Colors.Green.Darken3);
                        sc.Item().PaddingTop(4).Text($"Total Annual Payroll: ${totalAnnual:N2}").Bold();
                        sc.Item().Text($"Total Monthly Gross: ${totalMonthlyGross:N2}");
                        sc.Item().Text($"Estimated Tax Withholding: ${totalTax:N2}");
                        sc.Item().Text($"Total Monthly Net Disbursement: ${totalNet:N2}").Bold().FontColor(Colors.Green.Darken2);
                    });
                });

                page.Footer().AlignCenter().Text(x =>
                {
                    x.Span("Page ");
                    x.CurrentPageNumber();
                    x.Span(" of ");
                    x.TotalPages();
                });
            });
        });

        return document.GeneratePdf();
    }

    private static IContainer PdfHeaderStyle(IContainer container) =>
        container.Background(Colors.Blue.Darken3).PaddingVertical(6).PaddingHorizontal(4);

    private static IContainer PdfTealHeaderStyle(IContainer container) =>
        container.Background(Colors.Teal.Darken3).PaddingVertical(6).PaddingHorizontal(4);

    private static IContainer PdfGreenHeaderStyle(IContainer container) =>
        container.Background(Colors.Green.Darken3).PaddingVertical(6).PaddingHorizontal(4);

    private static IContainer PdfRowStyle(IContainer container, bool isEven) =>
        container.Background(isEven ? Colors.Grey.Lighten4 : Colors.White)
                 .BorderBottom(1)
                 .BorderColor(Colors.Grey.Lighten2)
                 .PaddingVertical(4)
                 .PaddingHorizontal(4);

    #endregion
}
