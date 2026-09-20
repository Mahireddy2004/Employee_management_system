@echo off
title EMS Database Migration
echo ========================================================
echo   Applying Entity Framework Core Migrations to MySQL
echo ========================================================
echo.
cd /d "%~dp0backend\EmployeeManagement.Api"
dotnet ef database update
echo.
echo Migration command finished.
pause
