# Employee Management System (EMS)

An enterprise-grade, full-stack Human Resources and Workforce Management web application built with **ASP.NET Core 8 Web API** and **React 19 + TypeScript + Vite + Tailwind CSS**.

The system provides a centralized portal for managing organizational staff, departmental hierarchies, daily attendance tracking, automated reporting (Excel & PDF), and executive workforce analytics.

---

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Key Features](#2-key-features)
- [3. Technology Stack](#3-technology-stack)
- [4. Project Structure](#4-project-structure)
- [5. Database Design & Schema](#5-database-design--schema)
- [6. Authentication & Authorization](#6-authentication--authorization)
- [7. API Endpoints](#7-api-endpoints)
- [8. Frontend Modules & Pages](#8-frontend-modules--pages)
- [9. Reports & Document Generation](#9-reports--document-generation)
- [10. Dashboard Analytics](#10-dashboard-analytics)
- [11. CSV Bulk Import Specification](#11-csv-bulk-import-specification)
- [12. Setup & Prerequisites](#12-setup--prerequisites)
- [13. Installation & Configuration](#13-installation--configuration)
- [14. Database Migration](#14-database-migration)
- [15. Running the Application](#15-running-the-application)
- [16. API Documentation & Testing (Swagger)](#16-api-documentation--testing-swagger)
- [17. Security Architecture](#17-security-architecture)
- [18. Build & Verification](#18-build--verification)
- [19. Troubleshooting](#19-troubleshooting)
- [20. Recommended 5-Minute Demo Flow](#20-recommended-5-minute-demo-flow)
- [21. Project Status & Readiness](#21-project-status--readiness)
- [22. Future Enhancements](#22-future-enhancements)
- [23. Project Submission Details](#23-project-submission-details)

---

## 1. Project Overview

The **Employee Management System (EMS)** is designed to streamline day-to-day HR operations, reduce administrative overhead, and deliver actionable workforce insights. 

It replaces disparate spreadsheets with a unified relational platform that enforces referential integrity, prevents duplicate attendance and email registrations, calculates payroll obligations, and exports publication-ready documents.

---

## 2. Key Features

- **Secure Authentication**: ASP.NET Core JWT Bearer authentication with cryptographically salted BCrypt password hashing.
- **Role-Based Protected Routing**: Client-side route guards prevent unauthorized access to application sections.
- **Employee Directory**: Complete CRUD operations, real-time debounced multi-field search, department filtering, employment status filtering, and server-side pagination.
- **Bulk Operations**: Multi-row selection, current-page bulk delete with indeterminate header controls, and batch employee creation.
- **CSV Data Ingestion**: Client-side CSV parser and validator with row-by-row error detection and downloadable sample CSV templates.
- **Department Hierarchy**: Organizational unit tracking with dynamic headcount badges, office locations, and allocated budget formatting in Indian Rupees (`₹`).
- **Referential Integrity Safeguards**: Safe deletion prevention blocks accidental removal of departments that contain active employees.
- **Attendance Tracking**: Multi-criteria filtering (date picker, employee dropdown, status), client-side pagination, time comparison validation, and server-side duplicate entry rejection.
- **Executive Analytics Dashboard**: Real-time KPI indicator cards (Headcount, Active, On Leave, Terminated, Monthly Payroll, Attendance Rate) and responsive charts (Recharts Pie, Bar, and Line).
- **Automated Report Generation**: Official `.xlsx` spreadsheets generated via **ClosedXML** and publication-ready `.pdf` documents generated via **QuestPDF** for Employee, Attendance, and Payroll data.
- **Enterprise UI/UX**: Responsive layout featuring a fixed desktop sidebar, off-canvas mobile drawer with backdrop blur, high-contrast accessible focus states, and standardized modal dialogs.
- **Performance Optimized**: Route-level code splitting via `React.lazy` and `<Suspense>` isolates visualization libraries and keeps initial bundles under 330 kB.

---

## 3. Technology Stack

### Backend
- **Framework**: .NET 8.0 / ASP.NET Core Web API
- **ORM**: Entity Framework Core 8.0 (Code-First)
- **Database Provider**: Pomelo.EntityFrameworkCore.MySql (MySQL 8.0)
- **Authentication**: Microsoft.AspNetCore.Authentication.JwtBearer (HS256)
- **Password Hashing**: BCrypt.Net-Next
- **Spreadsheet Engine**: ClosedXML
- **PDF Generation**: QuestPDF (Community License)
- **API Documentation**: Swashbuckle / Swagger OpenAPI

### Frontend
- **Framework**: React 19 (Strict Mode)
- **Language**: TypeScript 5.7+
- **Bundler / Tooling**: Vite 8.3
- **HTTP Client**: Axios with centralized request/response interceptors
- **Routing**: React Router DOM (v7)
- **Styling**: Tailwind CSS (v4) with `@tailwindcss/vite`
- **Component Icons**: Lucide React
- **Data Visualizations**: Recharts

---

## 4. Project Structure

```text
EmployeeManagementSystem/
├── backend/
│   └── EmployeeManagement.Api/
│       ├── Controllers/            # REST API endpoints (Auth, Employees, Departments, Attendance, Dashboard, Reports)
│       ├── Data/                   # EF Core DbContext, ModelBuilder mappings, DatabaseSeeder
│       ├── DTOs/                   # Request/Response Data Transfer Objects with DataAnnotations
│       ├── Migrations/             # EF Core database migrations & snapshot
│       ├── Models/                 # Domain entities (User, Department, Employee, Attendance)
│       ├── Services/               # Business logic (AuthService, ReportService)
│       ├── Properties/             # launchSettings.json (Port 5000 HTTP, 5001 HTTPS)
│       ├── appsettings.json        # Connection strings, JWT configuration, logging
│       ├── EmployeeManagement.Api.csproj
│       └── Program.cs              # DI container, middleware pipeline, CORS, JWT, Swagger
│
└── frontend/
    ├── public/                     # Favicons and static assets
    ├── src/
    │   ├── api/                    # Centralized Axios instance and domain API clients
    │   │   ├── axios.ts            # Base URL, Bearer interceptor, 401 handler
    │   │   ├── authApi.ts
    │   │   ├── employeeApi.ts
    │   │   ├── departmentApi.ts
    │   │   ├── attendanceApi.ts
    │   │   ├── dashboardApi.ts
    │   │   └── reportApi.ts
    │   ├── components/             # Reusable UI components
    │   │   ├── common/             # Standard Button component
    │   │   ├── Layout/             # Main responsive application shell
    │   │   ├── Navbar/             # Header, user badge, mobile toggle, logout
    │   │   ├── Sidebar/            # Navigation menu and mobile drawer
    │   │   ├── Loading/            # Accessible loading spinner with screen-reader support
    │   │   └── ProtectedRoute/     # Route guarding (ProtectedRoute, PublicRoute)
    │   ├── context/                # AuthContext (login, logout, token persistence)
    │   ├── pages/                  # Page-level route views (lazy-loaded)
    │   │   ├── Login/
    │   │   ├── Dashboard/
    │   │   ├── Employees/
    │   │   ├── Departments/
    │   │   ├── Attendance/
    │   │   └── Reports/
    │   ├── types/                  # TypeScript interface definitions matching backend DTOs
    │   ├── App.tsx                 # Route configuration with React.lazy and Suspense
    │   ├── index.css               # Tailwind CSS v4 imports, animations, scrollbars
    │   └── main.tsx                # Application root mount
    ├── .env                        # Local development environment configuration
    ├── .env.example                # Safe environment variable template
    ├── package.json                # Dependencies and scripts
    ├── tsconfig.json               # TypeScript strict configuration
    └── vite.config.ts              # Vite server settings, proxy, and Tailwind plugin
```

---

## 5. Database Design & Schema

The relational schema is configured via EF Core Code-First in `AppDbContext.cs`.

```
+----------------+          +----------------+          +----------------+
|  Departments   | 1      M |   Employees    | 1      M |   Attendance   |
+----------------+----------+----------------+----------+----------------+
| Id (PK)        |          | Id (PK)        |          | Id (PK)        |
| Name           |          | FirstName      |          | EmployeeId(FK) |
| Budget         |          | LastName       |          | Date           |
| Location       |          | Email (Unique) |          | Status         |
+----------------+          | Phone          |          | CheckInTime    |
                            | HireDate       |          | CheckOutTime   |
                            | Salary         |          +----------------+
                            | DepartmentId   |
                            | Status         |
                            +----------------+

+----------------+
|     Users      |
+----------------+
| Id (PK)        |
| Username       |
| Email (Unique) |
| PasswordHash   |
| Role           |
| CreatedAt      |
+----------------+
```

### Entity Relationships & Constraints
1. **`Department` $\rightarrow$ `Employees` (1-to-Many)**:
   - Foreign Key: `Employee.DepartmentId`
   - Delete Rule: `DeleteBehavior.Restrict` (Prevents deleting a department if employees are assigned).
2. **`Employee` $\rightarrow$ `Attendance` (1-to-Many)**:
   - Foreign Key: `Attendance.EmployeeId`
   - Delete Rule: `DeleteBehavior.Cascade` (Deleting an employee cascades to their historical attendance logs).
3. **Database Indices**:
   - `IX_Users_Email`: Unique constraint on `Users.Email`.
   - `IX_Employees_Email`: Unique constraint on `Employees.Email`.
   - `IX_Employees_DepartmentId`: Index for fast departmental joins.
   - `IX_Attendance_EmployeeId`: Index for employee logs retrieval.
   - `IX_Attendance_Date`: Index for date range filtering.

---

## 6. Authentication & Authorization

- **Registration (`POST /api/auth/register`)**: Validates email format, prevents duplicate email registrations, and hashes passwords using BCrypt.
- **Login (`POST /api/auth/login`)**: Validates credentials against the BCrypt hash. On success, issues a signed JWT token containing claims:
  - `NameIdentifier` (User ID)
  - `Name` (Username)
  - `Email` (Work Email)
  - `Role` (User Role)
- **Token Security**: Tokens are configured with HS256 encryption, zero clock-skew validation, and a 60-minute expiration.
- **Client Persistence**: Tokens are stored in browser `localStorage`. On application boot, the session is verified and restored.
- **Protected Controllers**: All data controllers (`Employees`, `Departments`, `Attendance`, `Reports`, `Dashboard`) require the `[Authorize]` attribute.
- **Automatic Logout**: If any request returns `401 Unauthorized`, the client automatically clears stored tokens and redirects to `/login`.

---

## 7. API Endpoints

### Authentication
| Method | Route | Description | Auth Required |
|:---|:---|:---|:---:|
| `POST` | `/api/auth/register` | Register a new user account | No |
| `POST` | `/api/auth/login` | Authenticate user and receive JWT token | No |

### Employees
| Method | Route | Description | Auth Required |
|:---|:---|:---|:---:|
| `GET` | `/api/employees` | Get paginated list of employees with search and filters | Yes |
| `GET` | `/api/employees/{id}` | Get single employee details by ID | Yes |
| `POST` | `/api/employees` | Create a new employee record | Yes |
| `PUT` | `/api/employees/{id}` | Update existing employee record | Yes |
| `DELETE` | `/api/employees/{id}` | Delete employee record by ID | Yes |
| `POST` | `/api/employees/bulk-create` | Batch insert multiple employee records | Yes |
| `POST` | `/api/employees/bulk-delete` | Batch delete multiple employees by ID list | Yes |

### Departments
| Method | Route | Description | Auth Required |
|:---|:---|:---|:---:|
| `GET` | `/api/departments` | List all departments with calculated employee counts | Yes |
| `GET` | `/api/departments/{id}` | Get single department details | Yes |
| `POST` | `/api/departments` | Create a new department | Yes |
| `PUT` | `/api/departments/{id}` | Update an existing department | Yes |
| `DELETE` | `/api/departments/{id}` | Delete department (blocked if employees assigned) | Yes |

### Attendance
| Method | Route | Description | Auth Required |
|:---|:---|:---|:---:|
| `GET` | `/api/attendance` | List attendance records filtered by employee, date, status | Yes |
| `GET` | `/api/attendance/{id}` | Get single attendance record | Yes |
| `POST` | `/api/attendance` | Log daily attendance (prevents duplicates) | Yes |
| `PUT` | `/api/attendance/{id}` | Update attendance record | Yes |
| `DELETE` | `/api/attendance/{id}` | Remove attendance record | Yes |

### Dashboard Analytics
| Method | Route | Description | Auth Required |
|:---|:---|:---|:---:|
| `GET` | `/api/dashboard/summary` | Retrieve aggregated KPIs, charts, and summary tables | Yes |

### Reports & Document Export
| Method | Route | Description | Auth Required |
|:---|:---|:---|:---:|
| `GET` | `/api/reports/export/excel?type={type}` | Download Excel report (`employees`, `attendance`, `payroll`) | Yes |
| `GET` | `/api/reports/export/pdf?type={type}` | Download PDF report (`employees`, `attendance`, `payroll`) | Yes |

---

## 8. Frontend Modules & Pages

1. **Login (`/login`)**:
   - Clean enterprise interface with email and password validation.
   - Show/hide password visibility toggle.
   - Convenient "Fill Demo Credentials" action for evaluation.
2. **Dashboard (`/dashboard`)**:
   - Executive metric cards: Total Staff, Active, On Leave, Terminated, Departments, Monthly Payroll, Average Attendance.
   - Recharts visualizations: Headcount breakdown (Pie), Onboarding trends (Bar), Daily presence (Line).
   - Department breakdown summary table with localized currency formatting.
3. **Employee Directory (`/employees`)**:
   - Search by name, email, or phone.
   - Filter by Department and Employment Status (`Active`, `OnLeave`, `Terminated`).
   - Server-side pagination and per-page size controls.
   - Multi-row selection toolbar with batch deletion.
   - CSV bulk import modal with live parsing and error detection.
   - Add/Edit Employee modal forms with input validation.
4. **Department Management (`/departments`)**:
   - Overview statistic cards for total units, staff capacity, and aggregate budget.
   - Client-side search by name or office location.
   - Department cards displaying ID, name, location, employee badge, and budget in INR (`₹`).
   - Safety dialog preventing deletion of populated departments.
5. **Attendance Tracking (`/attendance`)**:
   - Filter by specific date, employee, or status (`Present`, `Late`, `Absent`, `Excused`).
   - Client-side pagination (10 records/page) and one-click "Clear Filters" action.
   - Add/Edit modal with chronological check-in/out validation.
   - Graceful conflict resolution for duplicate entries.
6. **Reports & Exports (`/reports`)**:
   - Dedicated export cards for Workforce Profile, Attendance Activity, and Payroll.
   - Independent download triggers for Excel (.xlsx) and PDF (.pdf) with isolated loading spinners.

---

## 9. Reports & Document Generation

The system includes dedicated document generation services returning binary streams directly to the client:

| Report Category | Description | Excel (.xlsx) | PDF (.pdf) |
|:---|:---|:---:|:---:|
| **Employee Directory** | Complete roster, contact details, hire dates, salary, and active department assignments. | ClosedXML | QuestPDF |
| **Attendance Activity** | Daily presence timestamps, check-in, check-out, and status classifications. | ClosedXML | QuestPDF |
| **Payroll & Compensation** | Monthly gross calculations, statutory withholding estimates (15%), and net disbursement totals. | ClosedXML | QuestPDF |

---

## 10. Dashboard Analytics

The executive dashboard consumes `GET /api/dashboard/summary` and visualizes:
- **Headcount KPIs**: Total registered staff, active employees, on-leave employees, and archived/terminated employees.
- **Financial Metric**: Total active monthly payroll expenditure calculated as:
  $$\text{Monthly Payroll} = \frac{\sum \text{Active Salaries}}{12}$$
- **Presence Rate**: Organization-wide attendance percentage calculated as:
  $$\text{Attendance Rate} = \frac{\text{Present Records}}{\text{Total Attendance Records}} \times 100$$
- **Department Distribution Chart**: Interactive Recharts `PieChart` showing staffing distribution.
- **Hiring Trends Chart**: 6-month historical onboarding volume displayed as a `BarChart`.
- **Attendance Trends Chart**: Trailing workday presence plotted against absences using a multi-line `LineChart`.

---

## 11. CSV Bulk Import Specification

The bulk employee ingestion engine supports standard `.csv` files matching the schema:

### CSV Header Format
```csv
FirstName,LastName,Email,Phone,HireDate,Salary,DepartmentId,Status
```

### Sample Record
```csv
Jane,Smith,jane.smith@example.com,+91 98765 12345,2026-01-15,650000,1,Active
```

### Validation Rules Enforced
- **Headers**: Exact matching of the 8 required columns.
- **Names**: `FirstName` and `LastName` are mandatory (max 100 characters).
- **Email**: Must be a valid email format and unique across both the existing database and the uploaded file.
- **Salary**: Must be a numeric value strictly greater than 0.
- **Department ID**: Must correspond to an existing department ID in the database.
- **Status**: Must be one of `Active`, `OnLeave`, or `Terminated`.

---

## 12. Setup & Prerequisites

Before running the application, ensure the following software is installed on your workstation:

- **.NET 8 SDK**: Version 8.0.x ([Download .NET 8](https://dotnet.microsoft.com/download/dotnet/8.0))
- **Node.js**: Version 18.x or 20.x ([Download Node.js](https://nodejs.org/))
- **npm**: Version 9.x or higher (included with Node.js)
- **MySQL Server**: Version 8.0 or higher ([Download MySQL](https://dev.mysql.com/downloads/mysql/))
- **MySQL Workbench** or any preferred database client (optional)
- **Git**: For version control

---

## 13. Installation & Configuration

### 1. Clone the Repository
```powershell
git clone <repository-url>
cd employee-management-system
```

### 2. Backend Configuration
Navigate to the backend API directory:
```powershell
cd EmployeeManagementSystem/backend/EmployeeManagement.Api
```

Inspect `appsettings.json` and configure your local MySQL database connection string:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "server=localhost;port=3306;database=employee_management;user=root;password=YOUR_MYSQL_PASSWORD"
  },
  "Jwt": {
    "Key": "YOUR_STRONG_SECRET_KEY_MINIMUM_32_BYTES_LONG!",
    "Issuer": "EmployeeManagementApi",
    "Audience": "EmployeeManagementClient",
    "ExpiresInMinutes": 60
  }
}
```

Restore backend packages:
```powershell
dotnet restore
```

### 3. Frontend Configuration
Navigate to the frontend directory:
```powershell
cd ../../frontend
```

Install frontend npm dependencies:
```powershell
npm install
```

Verify or create the local environment file `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 14. Database Migration

Ensure your local MySQL service is running, then apply the Entity Framework Core migrations to create the database schema:

```powershell
# From EmployeeManagementSystem/backend/EmployeeManagement.Api
dotnet ef database update
```

> **Note on Initial Seed Data**:
> Upon first startup, the backend's `DatabaseSeeder` automatically populates the database with:
> - 1 Default Administrator Account (`admin@example.com`)
> - 4 Departments (Engineering, Human Resources, Marketing, Finance)
> - 20 Employees with diverse roles, salaries, and employment statuses
> - 280 Attendance records spanning trailing workdays
>
> **Important**: For security reasons, update default administrator credentials prior to production deployment.

---

## 15. Running the Application

For local development, open two terminal windows:

### Terminal 1: Start Backend API
```powershell
cd EmployeeManagementSystem/backend/EmployeeManagement.Api
dotnet run
```
- **Backend API URL**: `http://localhost:5000`
- **Swagger Documentation**: `http://localhost:5000/swagger`

### Terminal 2: Start Frontend Application
```powershell
cd EmployeeManagementSystem/frontend
npm run dev
```
- **Frontend Portal URL**: `http://localhost:3000`

Access the portal by navigating to `http://localhost:3000` in your web browser.

---

## 16. API Documentation & Testing (Swagger)

In Development mode, the backend exposes an interactive **Swagger UI** at:
`http://localhost:5000/swagger`

### Testing with Postman or Swagger UI
1. Call `POST /api/auth/login` with your credentials to obtain a JWT token.
2. In Swagger UI, click the **Authorize** button at the top right.
3. Enter the token string (Swagger adds the `Bearer ` scheme automatically).
4. Execute authenticated endpoints directly from the interface.

---

## 17. Security Architecture

- **Password Storage**: Uses BCrypt salted key derivation; plaintext passwords are never stored or logged.
- **Payload Privacy**: DTO responses exclude sensitive attributes such as password hashes.
- **Stateless Authentication**: Signed JWT tokens eliminate server-side session bloat while providing tamper-proof role authorization.
- **Cross-Origin Resource Sharing (CORS)**: Explicitly restricted to trusted frontend origins (`http://localhost:3000`, `http://localhost:5173`) with custom headers exposed (`Content-Disposition`).
- **Input Validation**: Server-side model binding rejects invalid requests via ASP.NET Core `ModelState` validation.
- **SQL Injection Prevention**: EF Core utilizes parameterized SQL queries across all database operations.

---

## 18. Build & Verification

Both frontend and backend projects compile with **0 errors and 0 warnings**:

### Compile Backend
```powershell
dotnet build EmployeeManagementSystem/backend/EmployeeManagement.Api/EmployeeManagement.Api.csproj
```
*Output: `Build succeeded. 0 Warning(s), 0 Error(s)`*

### Compile Frontend
```powershell
npm run build --prefix EmployeeManagementSystem/frontend
```
*Output: `✓ built in ~750ms — 0 errors, 0 warnings`*

---

## 19. Troubleshooting

### 1. MySQL Connection Refused
- Ensure the MySQL Windows service is started (`Get-Service MySQL*` in PowerShell).
- Verify the port (`3306`), user, and password in `appsettings.json`.

### 2. Frontend Fails to Connect to Backend
- Confirm the backend API is running on `http://localhost:5000`.
- Verify `VITE_API_BASE_URL=http://localhost:5000/api` is present in `frontend/.env`.

### 3. Port Conflicts
- If port `5000` is in use, modify `applicationUrl` in `launchSettings.json`.
- If port `3000` is in use, Vite will automatically select the next available port (e.g., `3001`).

### 4. CORS Errors in Browser
- Ensure the frontend URL matches one of the allowed origins in `Program.cs` (`http://localhost:3000`, `http://localhost:5173`).

---

## 20. Recommended 5-Minute Demo Flow

For evaluators and recruiters reviewing this submission:

1. **Sign In**: Navigate to `http://localhost:3000/login`. Click **Fill Demo Credentials** and click **Sign In to Dashboard**.
2. **Dashboard Review**: Observe the 7 executive KPI cards, the headcount distribution PieChart, hiring BarChart, and attendance LineChart.
3. **Employee Directory**: Navigate to `/employees`. Test the live search bar (type "Alexander" or "Engineering").
4. **Add Employee**: Click **Add Employee**, fill in details, and confirm the new staff member appears in the list.
5. **CSV Ingestion**: Click **Import CSV**, download the sample template, and test uploading a batch file.
6. **Bulk Operations**: Select multiple employee checkboxes and trigger **Bulk Delete**.
7. **Departments**: Navigate to `/departments`. Review allocated budgets in INR (`₹`) and test the safety warning when attempting to delete a populated department.
8. **Attendance**: Navigate to `/attendance`. Filter logs by date or employee. Click **Add Attendance** to test check-in time validation.
9. **Reports**: Navigate to `/reports`. Click **Export Excel** and **Export PDF** to review generated documents.
10. **Sign Out**: Click the **Logout** button on the Navbar to verify session teardown and redirect back to `/login`.

---

## 21. Project Status & Readiness

- **Frontend Compilation**: **PASS** (TypeScript strict, Vite production build clean).
- **Backend Compilation**: **PASS** (.NET 8 SDK build clean).
- **Code Audit**: Complete. Zero `any` types, zero dead code blocks, zero console pollution.
- **Environment Dependency**: Applying migrations (`dotnet ef database update`) and performing live browser sessions require a running MySQL 8 database instance.

---

## 22. Future Enhancements

- **Granular RBAC**: Multi-tier permission matrix (e.g., Department Manager vs HR Director).
- **Audit Logging**: Change-tracking ledger recording historical edits across employee profiles.
- **Containerization**: Multi-stage `Dockerfile` and `docker-compose.yml` for single-command production deployment.
- **Automated Testing Suite**: End-to-end testing with Playwright and backend integration tests using `WebApplicationFactory` and xUnit.

---

## 23. Project Submission Details

- **Project Title**: Employee Management System (EMS)
- **Architecture**: Decoupled Web API Backend + Single Page Application Frontend
- **Submission Date**: September 2026
