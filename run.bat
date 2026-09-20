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

:: Wait 3 seconds for backend process initialization
timeout /t 3 /nobreak >nul

:: 2. Start Frontend Client
echo [2/2] Launching Frontend Vite Server (http://localhost:3000)...
start "EMS - Frontend (:3000)" cmd /k "cd /d ""%ROOT_DIR%frontend"" && npm run dev"

echo.
echo ========================================================
echo  EMS is running!
echo  - Frontend Portal:       http://localhost:3000
echo  - Backend API / Swagger: http://localhost:5000/swagger
echo.
echo  Default Administrator Credentials:
echo    Email:    admin@example.com
echo    Password: Admin@123
echo ========================================================
echo.
timeout /t 2 /nobreak >nul
start http://localhost:3000
pause
