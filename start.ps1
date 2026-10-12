Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "      Starting Employee Management System (EMS)         " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n[1/2] Starting Backend (.NET 8 Web API on http://localhost:5000)..." -ForegroundColor Yellow
$backendProcess = Start-Process cmd -ArgumentList "/k", "title EMS - Backend API (:5000) & cd /d `"$rootDir\backend\EmployeeManagement.Api`" && dotnet run" -PassThru

Write-Host "Waiting for backend API and database to initialize..." -NoNewline
$backendReady = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
	try {
		$response = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 2 -UseBasicParsing
		if ($response.StatusCode -eq 200) {
			$backendReady = $true
			break
		}
	}
	catch {}
	Write-Host "." -NoNewline
	Start-Sleep -Seconds 1
}
Write-Host ""

if (-not $backendReady) {
	Write-Host "`n[ERROR] Backend/database did not become ready within 30 seconds." -ForegroundColor Red
	Write-Host "Check the backend terminal window for error details and verify MySQL is running." -ForegroundColor Red
	Read-Host "`nPress Enter to exit..."
	exit 1
}
Write-Host "Backend API is ready!" -ForegroundColor Green

Write-Host "`n[2/2] Starting Frontend (React + Vite)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k", "title EMS - Frontend & cd /d `"$rootDir\frontend`" && npm run dev"

Write-Host "Waiting for frontend server to initialize..." -NoNewline
$frontendUrl = "http://localhost:3000"
for ($attempt = 0; $attempt -lt 15; $attempt++) {
	foreach ($port in @(3000, 3001, 5173)) {
		try {
			$response = Invoke-WebRequest -Uri "http://localhost:$port" -TimeoutSec 1 -UseBasicParsing
			if ($response.StatusCode -eq 200) {
				$frontendUrl = "http://localhost:$port"
				$attempt = 999
				break
			}
		}
		catch {}
	}
	if ($attempt -lt 999) {
		Write-Host "." -NoNewline
		Start-Sleep -Seconds 1
	}
}
Write-Host ""
Write-Host "Frontend server is ready!" -ForegroundColor Green

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host " EMS Services Started!" -ForegroundColor Green
Write-Host " - Frontend Portal:       $frontendUrl" -ForegroundColor Green
Write-Host " - Backend API / Swagger: http://localhost:5000/swagger" -ForegroundColor Green
Write-Host "`n Default Administrator Login:" -ForegroundColor White
Write-Host "   Email:    admin@example.com" -ForegroundColor White
Write-Host "   Password: Admin@123" -ForegroundColor White
Write-Host "========================================================`n" -ForegroundColor Green

Start-Sleep -Seconds 1
Start-Process $frontendUrl
