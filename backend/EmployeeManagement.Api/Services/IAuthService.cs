using EmployeeManagement.Api.DTOs;

namespace EmployeeManagement.Api.Services;

public interface IAuthService
{
    Task<UserResponseDto> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto?> LoginAsync(LoginDto dto);
}
