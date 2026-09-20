using EmployeeManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagement.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    /// <summary>
    /// GET /api/reports/export/excel?type=employees|attendance|payroll
    /// Generates and returns a formatted Excel spreadsheet (.xlsx).
    /// </summary>
    [HttpGet("export/excel")]
    public async Task<IActionResult> ExportExcel([FromQuery] string type = "employees")
    {
        try
        {
            var bytes = await _reportService.GenerateExcelReportAsync(type);
            var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmm");
            var filename = $"{type.ToLowerInvariant()}_report_{timestamp}.xlsx";
            const string contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

            return File(bytes, contentType, filename);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/reports/export/pdf?type=employees|attendance|payroll
    /// Generates and returns a publication-ready PDF report document.
    /// </summary>
    [HttpGet("export/pdf")]
    public async Task<IActionResult> ExportPdf([FromQuery] string type = "employees")
    {
        try
        {
            var bytes = await _reportService.GeneratePdfReportAsync(type);
            var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmm");
            var filename = $"{type.ToLowerInvariant()}_report_{timestamp}.pdf";
            const string contentType = "application/pdf";

            return File(bytes, contentType, filename);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
