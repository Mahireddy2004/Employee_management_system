@echo off
title Employee Management System Launcher
echo ========================================================
echo       Starting Employee Management System (EMS)
echo ========================================================
echo.

set "ROOT_DIR=%~dp0"

:: 1. Start Backend API
echo [1/2] Launching ASP.NET Core Web API (http://localhost:5000)...
start "EMS - Backend API (:5000)" cmd /k "cd /d ""%ROOT_DIR%backend\EmployeeManagement.Api"" && dotnet run"

:: Wait until the API can connect to its database and has no pending migrations
set /a attempts=0
<nul set /p =Waiting for backend API to initialize...
:wait_backend
powershell -NoProfile -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:5000/health' -TimeoutSec 2 -UseBasicParsing; if ($response.StatusCode -eq 200) { exit 0 } } catch {}; exit 1" >nul 2>&1
if errorlevel 1 (
	set /a attempts+=1
	<nul set /p =.
	if %attempts% GEQ 30 (
		echo.
		echo.
		echo [ERROR] Backend/database did not become ready within 30 seconds.
		echo Check the backend terminal window for error details and verify MySQL is running.
		echo.
		pause
		exit /b 1
	)
	timeout /t 1 /nobreak >nul
	goto wait_backend
)
echo.
echo Backend API is ready!

:: 2. Start Frontend Client
echo.
echo [2/2] Launching Frontend Server...
start "EMS - Frontend" cmd /k "cd /d ""%ROOT_DIR%frontend"" && npm run dev"

:: Wait for frontend server to become responsive and detect port (3000 or 3001)
<nul set /p =Waiting for frontend server to initialize...
set /a fe_attempts=0
set "FRONTEND_URL=http://localhost:3000"
:wait_frontend
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 1 -UseBasicParsing; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; exit 1" >nul 2>&1
if not errorlevel 1 (
	set "FRONTEND_URL=http://localhost:3000"
	goto fe_ready
)
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3001' -TimeoutSec 1 -UseBasicParsing; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; exit 1" >nul 2>&1
if not errorlevel 1 (
	set "FRONTEND_URL=http://localhost:3001"
	goto fe_ready
)
set /a fe_attempts+=1
<nul set /p =.
if %fe_attempts% LSS 15 (
	timeout /t 1 /nobreak >nul
	goto wait_frontend
)

:fe_ready
echo.
echo Frontend server is ready!

echo.
echo ========================================================
echo  EMS is running!
echo  - Frontend Portal:       %FRONTEND_URL%
echo  - Backend API / Swagger: http://localhost:5000/swagger
echo.
echo  Default Administrator Credentials:
echo    Email:    admin@example.com
echo    Password: Admin@123
echo ========================================================
echo.
timeout /t 1 /nobreak >nul
start "" "%FRONTEND_URL%"
pause
