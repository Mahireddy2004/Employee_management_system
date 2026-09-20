Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "      Starting Employee Management System (EMS)         " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n[1/2] Starting Backend (.NET 8 Web API on http://localhost:5000)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k", "cd /d `"$rootDir\backend\EmployeeManagement.Api`" && dotnet run"

Start-Sleep -Seconds 3

Write-Host "[2/2] Starting Frontend (React + Vite on http://localhost:3000)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k", "cd /d `"$rootDir\frontend`" && npm run dev"

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host " EMS Services Started!" -ForegroundColor Green
Write-Host " - Frontend Portal:       http://localhost:3000" -ForegroundColor Green
Write-Host " - Backend API / Swagger: http://localhost:5000/swagger" -ForegroundColor Green
Write-Host "`n Default Administrator Login:" -ForegroundColor White
Write-Host "   Email:    admin@example.com" -ForegroundColor White
Write-Host "   Password: Admin@123" -ForegroundColor White
Write-Host "========================================================`n" -ForegroundColor Green

Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"
