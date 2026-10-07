namespace EmployeeManagement.Api.Services;

public interface IReportService
{
    Task<byte[]> GenerateExcelReportAsync(string reportType);
    Task<byte[]> GeneratePdfReportAsync(string reportType);
    Task<byte[]> GenerateCsvReportAsync(string reportType);
}
