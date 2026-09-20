import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  IndianRupee,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { employeeApi } from '../../api/employeeApi';
import { departmentApi } from '../../api/departmentApi';
import type {
  CreateEmployeeRequest,
  Employee,
  EmployeeStatus,
  UpdateEmployeeRequest,
} from '../../types/employee';
import type { Department } from '../../types/department';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/Loading/Loading';

/**
 * Formats numerical salary amounts in Indian Rupee (INR) format.
 * Example: 125000 -> ₹1,25,000
 */
const formatINR = (value: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Formats standard ISO date strings into readable "DD MMM YYYY" format.
 * Example: "2026-09-20T00:00:00" -> "20 Sep 2026"
 */
const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

/**
 * Converts a Date or ISO string into YYYY-MM-DD for standard HTML5 date inputs.
 */
const toDateInputValue = (dateStr?: string): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    return d.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

interface ParsedCSVEmployee {
  rowNumber: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  hireDate: string;
  salary: number;
  departmentId: number;
  status: EmployeeStatus;
}

interface CSVValidationResult {
  validRows: ParsedCSVEmployee[];
  errors: string[];
}

/**
 * Client-side CSV parser and validator.
 * Validates headers, required fields, formats, positive numeric salary, and valid department IDs.
 */
const parseAndValidateCSV = (
  csvText: string,
  availableDepartmentIds: Set<number>
): CSVValidationResult => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return {
      validRows: [],
      errors: ['The uploaded CSV file is empty or contains no data rows.'],
    };
  }

  // Parse header
  const headerLine = lines[0];
  const headers = headerLine.split(',').map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

  const expectedHeaders = [
    'firstname',
    'lastname',
    'email',
    'phone',
    'hiredate',
    'salary',
    'departmentid',
    'status',
  ];

  // Verify that required headers exist
  const missingHeaders: string[] = [];
  expectedHeaders.forEach((expected) => {
    if (!headers.includes(expected)) {
      missingHeaders.push(expected);
    }
  });

  if (missingHeaders.length > 0) {
    return {
      validRows: [],
      errors: [
        `Missing required column header(s): ${missingHeaders.join(
          ', '
        )}. Required columns: FirstName, LastName, Email, Phone, HireDate, Salary, DepartmentId, Status`,
      ],
    };
  }

  const colIdx = {
    firstName: headers.indexOf('firstname'),
    lastName: headers.indexOf('lastname'),
    email: headers.indexOf('email'),
    phone: headers.indexOf('phone'),
    hireDate: headers.indexOf('hiredate'),
    salary: headers.indexOf('salary'),
    departmentId: headers.indexOf('departmentid'),
    status: headers.indexOf('status'),
  };

  const validRows: ParsedCSVEmployee[] = [];
  const errors: string[] = [];
  const seenEmails = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const line = lines[i];
    const rawCols = line.split(',').map((val) => val.trim().replace(/^["']|["']$/g, ''));

    if (rawCols.length < expectedHeaders.length) {
      errors.push(`Row ${rowNum}: Incomplete record (expected ${expectedHeaders.length} columns).`);
      continue;
    }

    const firstName = rawCols[colIdx.firstName] ?? '';
    const lastName = rawCols[colIdx.lastName] ?? '';
    const email = rawCols[colIdx.email] ?? '';
    const phone = rawCols[colIdx.phone] ?? '';
    const hireDate = rawCols[colIdx.hireDate] ?? '';
    const salaryStr = rawCols[colIdx.salary] ?? '';
    const deptIdStr = rawCols[colIdx.departmentId] ?? '';
    const status = rawCols[colIdx.status] ?? '';

    let rowHasError = false;

    if (!firstName) {
      errors.push(`Row ${rowNum}: FirstName is required.`);
      rowHasError = true;
    }
    if (!lastName) {
      errors.push(`Row ${rowNum}: LastName is required.`);
      rowHasError = true;
    }
    if (!email) {
      errors.push(`Row ${rowNum}: Email is required.`);
      rowHasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Row ${rowNum}: Invalid email format '${email}'.`);
      rowHasError = true;
    } else if (seenEmails.has(email.toLowerCase())) {
      errors.push(`Row ${rowNum}: Duplicate email '${email}' within CSV batch.`);
      rowHasError = true;
    } else {
      seenEmails.add(email.toLowerCase());
    }

    if (!hireDate) {
      errors.push(`Row ${rowNum}: HireDate is required.`);
      rowHasError = true;
    } else {
      const d = new Date(hireDate);
      if (isNaN(d.getTime())) {
        errors.push(`Row ${rowNum}: Invalid HireDate '${hireDate}'. Use YYYY-MM-DD format.`);
        rowHasError = true;
      }
    }

    const salary = parseFloat(salaryStr);
    if (!salaryStr || isNaN(salary) || salary <= 0) {
      errors.push(`Row ${rowNum}: Salary must be a positive number (got '${salaryStr}').`);
      rowHasError = true;
    }

    const departmentId = parseInt(deptIdStr, 10);
    if (!deptIdStr || isNaN(departmentId) || departmentId <= 0) {
      errors.push(`Row ${rowNum}: DepartmentId must be a positive integer (got '${deptIdStr}').`);
      rowHasError = true;
    } else if (availableDepartmentIds.size > 0 && !availableDepartmentIds.has(departmentId)) {
      errors.push(
        `Row ${rowNum}: DepartmentId ${departmentId} does not match any existing department.`
      );
      rowHasError = true;
    }

    const normalizedStatus = status.replace(/\s+/g, '').toLowerCase();
    let validStatus: EmployeeStatus = 'Active';
    if (normalizedStatus === 'active') {
      validStatus = 'Active';
    } else if (normalizedStatus === 'onleave' || normalizedStatus === 'leave') {
      validStatus = 'OnLeave';
    } else if (normalizedStatus === 'terminated') {
      validStatus = 'Terminated';
    } else {
      errors.push(
        `Row ${rowNum}: Status must be 'Active', 'OnLeave', or 'Terminated' (got '${status}').`
      );
      rowHasError = true;
    }

    if (!rowHasError) {
      validRows.push({
        rowNumber: rowNum,
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        hireDate,
        salary,
        departmentId,
        status: validStatus,
      });
    }
  }

  return { validRows, errors };
};

export const EmployeesPage: React.FC = () => {
  // Directory & pagination state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Row selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);

  // API loading & feedback states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Single Add / Edit Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form fields
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    hireDate: string;
    salary: string;
    departmentId: string;
    status: EmployeeStatus;
  }>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    hireDate: toDateInputValue(),
    salary: '',
    departmentId: '',
    status: 'Active',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Single Delete state
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Bulk Delete state
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  // Bulk Create (CSV Import) modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedCSVEmployee[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Debounce search query changes by 350ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
      setSelectedIds(new Set()); // Reset selection on new search to avoid stale targets
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load department options on component mount
  useEffect(() => {
    departmentApi
      .getAll()
      .then((data) => {
        setDepartments(data);
      })
      .catch((err) => {
        console.error('Failed to load departments:', err);
      });
  }, []);

  // Fetch employees list from backend API
  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await employeeApi.getAll({
        page: currentPage,
        pageSize,
        search: debouncedSearch || undefined,
        departmentId: departmentFilter ? parseInt(departmentFilter, 10) : undefined,
        status: statusFilter || undefined,
      });
      setEmployees(res.items);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages || 1);
    } catch (err: unknown) {
      console.error('Failed to load employees:', err);
      setApiError(
        'Unable to load employees. Please ensure the backend service is running and properly authenticated.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, departmentFilter, statusFilter]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Auto-dismiss feedback alert after 5 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Manage header checkbox state (checked vs indeterminate vs unchecked)
  const isAllCurrentPageSelected =
    employees.length > 0 && employees.every((emp) => selectedIds.has(emp.id));
  const isSomeCurrentPageSelected =
    employees.some((emp) => selectedIds.has(emp.id)) && !isAllCurrentPageSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeCurrentPageSelected;
    }
  }, [isSomeCurrentPageSelected]);

  // Handle header checkbox toggle (select all visible on current page)
  const handleToggleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        employees.forEach((e) => next.delete(e.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        employees.forEach((e) => next.add(e.id));
        return next;
      });
    }
  };

  // Handle individual row checkbox toggle
  const handleToggleSelectOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Open single Add modal
  const handleOpenAddModal = () => {
    setEmployeeToEdit(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      hireDate: toDateInputValue(),
      salary: '',
      departmentId: departments.length > 0 ? String(departments[0].id) : '',
      status: 'Active',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open single Edit modal
  const handleOpenEditModal = (emp: Employee) => {
    setEmployeeToEdit(emp);
    setFormData({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone ?? '',
      hireDate: toDateInputValue(emp.hireDate),
      salary: String(emp.salary),
      departmentId: String(emp.departmentId),
      status: emp.status,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Validate single Add/Edit form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required.';
    } else if (formData.firstName.trim().length > 100) {
      errors.firstName = 'First name cannot exceed 100 characters.';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required.';
    } else if (formData.lastName.trim().length > 100) {
      errors.lastName = 'Last name cannot exceed 100 characters.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Work email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    } else if (formData.email.trim().length > 150) {
      errors.email = 'Email cannot exceed 150 characters.';
    }

    if (formData.phone && formData.phone.trim().length > 20) {
      errors.phone = 'Phone number cannot exceed 20 characters.';
    }

    if (!formData.hireDate) {
      errors.hireDate = 'Hire date is required.';
    }

    const parsedSalary = parseFloat(formData.salary);
    if (!formData.salary.trim() || isNaN(parsedSalary) || parsedSalary <= 0) {
      errors.salary = 'Please enter a valid salary greater than 0.';
    }

    if (!formData.departmentId || parseInt(formData.departmentId, 10) <= 0) {
      errors.departmentId = 'Please select a valid department.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit single Add/Edit form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || isSaving) {
      return;
    }

    setIsSaving(true);
    const parsedDeptId = parseInt(formData.departmentId, 10);
    const parsedSalary = parseFloat(formData.salary);

    try {
      if (employeeToEdit) {
        // Edit mode: PUT /api/employees/{id}
        const payload: UpdateEmployeeRequest = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          hireDate: formData.hireDate,
          salary: parsedSalary,
          departmentId: parsedDeptId,
          status: formData.status,
        };
        await employeeApi.update(employeeToEdit.id, payload);
        setFeedback({
          type: 'success',
          message: `Employee "${formData.firstName} ${formData.lastName}" updated successfully.`,
        });
      } else {
        // Create mode: POST /api/employees
        const payload: CreateEmployeeRequest = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          hireDate: formData.hireDate,
          salary: parsedSalary,
          departmentId: parsedDeptId,
          status: formData.status,
        };
        await employeeApi.create(payload);
        setFeedback({
          type: 'success',
          message: `Employee "${formData.firstName} ${formData.lastName}" added successfully.`,
        });
      }

      setIsModalOpen(false);
      loadEmployees();
    } catch (err: unknown) {
      console.error('Failed to save employee:', err);
      let errorMsg = 'Failed to save employee. Please verify details and try again.';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
        if (axiosErr.response?.data?.message) {
          errorMsg = axiosErr.response.data.message;
        } else if (axiosErr.response?.status === 409) {
          errorMsg = 'An employee with this email address already exists.';
        }
      }
      setFeedback({ type: 'error', message: errorMsg });
    } finally {
      setIsSaving(false);
    }
  };

  // Submit single employee delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;

    setIsDeleting(true);
    try {
      await employeeApi.delete(deleteTarget.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      setFeedback({
        type: 'success',
        message: `Employee "${deleteTarget.fullName}" deleted successfully.`,
      });
      setDeleteTarget(null);

      // If last item on page deleted, shift back a page if possible
      if (employees.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        loadEmployees();
      }
    } catch (err: unknown) {
      console.error('Failed to delete employee:', err);
      let errorMsg = 'Unable to delete employee. Please try again.';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        if (axiosErr.response?.data?.message) {
          errorMsg = axiosErr.response.data.message;
        }
      }
      setFeedback({ type: 'error', message: errorMsg });
    } finally {
      setIsDeleting(false);
    }
  };

  // Submit Bulk Delete
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.size === 0 || isBulkDeleting) return;

    setIsBulkDeleting(true);
    const idsToDelete = Array.from(selectedIds);

    try {
      const res = await employeeApi.bulkDelete({ employeeIds: idsToDelete });

      if (res.failureCount === 0) {
        setFeedback({
          type: 'success',
          message: `Successfully deleted all ${res.successCount} selected employee(s).`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: `Deleted ${res.successCount} employee(s). ${res.failureCount} failed: ${res.errors.join('; ')}`,
        });
      }

      setIsBulkDeleteModalOpen(false);
      setSelectedIds(new Set());

      // If all employees on current page were deleted and we aren't on page 1, adjust page
      if (employees.every((e) => selectedIds.has(e.id)) && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        loadEmployees();
      }
    } catch (err: unknown) {
      console.error('Bulk delete request failed:', err);
      let errorMsg = 'Bulk deletion failed. Please try again.';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        if (axiosErr.response?.data?.message) {
          errorMsg = axiosErr.response.data.message;
        }
      }
      setFeedback({ type: 'error', message: errorMsg });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Handle CSV file selection and parsing
  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImportFile(null);
      setParsedRows([]);
      setImportErrors([]);
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setImportFile(null);
      setParsedRows([]);
      setImportErrors(['Only .csv files are supported. Please select a valid CSV document.']);
      return;
    }

    setImportFile(file);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setParsedRows([]);
        setImportErrors(['The selected file is empty.']);
        return;
      }

      const availableDeptIds = new Set(departments.map((d) => d.id));
      const result = parseAndValidateCSV(text, availableDeptIds);
      setParsedRows(result.validRows);
      setImportErrors(result.errors);
    };

    reader.onerror = () => {
      setParsedRows([]);
      setImportErrors(['Failed to read the selected file. Please try again.']);
    };

    reader.readAsText(file);
  };

  // Download CSV template
  const handleDownloadTemplate = () => {
    const headers = 'FirstName,LastName,Email,Phone,HireDate,Salary,DepartmentId,Status\n';
    const sampleRow =
      departments.length > 0
        ? `Jane,Smith,jane.smith@example.com,+91 98765 12345,2026-01-15,650000,${departments[0].id},Active\n`
        : 'Jane,Smith,jane.smith@example.com,+91 98765 12345,2026-01-15,650000,1,Active\n';

    const blob = new Blob([headers + sampleRow], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'employees_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Submit Bulk Create (CSV Import)
  const handleConfirmImport = async () => {
    if (parsedRows.length === 0 || importErrors.length > 0 || isImporting) {
      return;
    }

    setIsImporting(true);
    try {
      const payload = {
        employees: parsedRows.map((r) => ({
          firstName: r.firstName,
          lastName: r.lastName,
          email: r.email,
          phone: r.phone,
          hireDate: r.hireDate,
          salary: r.salary,
          departmentId: r.departmentId,
          status: r.status,
        })),
      };

      const res = await employeeApi.bulkCreate(payload);

      if (res.failureCount === 0) {
        setFeedback({
          type: 'success',
          message: `Successfully imported all ${res.successCount} employees from CSV.`,
        });
      } else {
        setFeedback({
          type: res.successCount > 0 ? 'success' : 'error',
          message: `Imported ${res.successCount} employees. ${res.failureCount} failed: ${res.errors.join('; ')}`,
        });
      }

      setIsImportModalOpen(false);
      setImportFile(null);
      setParsedRows([]);
      setImportErrors([]);
      setCurrentPage(1);
      loadEmployees();
    } catch (err: unknown) {
      console.error('Failed to import employees:', err);
      let errorMsg = 'Failed to import employees from CSV. Please verify formatting.';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        if (axiosErr.response?.data?.message) {
          errorMsg = axiosErr.response.data.message;
        }
      }
      setFeedback({ type: 'error', message: errorMsg });
    } finally {
      setIsImporting(false);
    }
  };

  // Status badge styling helper
  const renderStatusBadge = (status: EmployeeStatus | string) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            Active
          </span>
        );
      case 'OnLeave':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
            On Leave
          </span>
        );
      case 'Terminated':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
            Terminated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">
            Employee Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage, filter, and review all workforce team members and assignments.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Import Employees Action */}
          <Button
            variant="outline"
            onClick={() => {
              setImportFile(null);
              setParsedRows([]);
              setImportErrors([]);
              setIsImportModalOpen(true);
            }}
            className="flex items-center space-x-2 text-slate-700 hover:text-indigo-600 shadow-xs"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </Button>

          {/* Add Employee Primary Action */}
          <Button
            onClick={handleOpenAddModal}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </Button>
        </div>
      </div>

      {/* Global Feedback Banner (Toast / Alert) */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-xl flex items-center justify-between shadow-xs transition-all animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* API Error Alert */}
      {apiError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm font-medium m-0">{apiError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadEmployees} className="flex items-center space-x-1.5">
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </Button>
        </div>
      )}

      {/* Filter and Search Bar Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search Input with Clear Button */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          {/* Department Filter */}
          <div className="relative flex-1 sm:flex-none sm:w-52">
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setCurrentPage(1);
                setSelectedIds(new Set());
              }}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 transition-colors"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative flex-1 sm:flex-none sm:w-44">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
                setSelectedIds(new Set());
              }}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="OnLeave">On Leave</option>
              <option value="Terminated">Terminated</option>
            </select>
          </div>

          {/* Reset Filters Quick Button */}
          {(searchQuery || departmentFilter || statusFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setDepartmentFilter('');
                setStatusFilter('');
                setCurrentPage(1);
                setSelectedIds(new Set());
              }}
              className="text-xs text-slate-600 hover:text-slate-900 shrink-0"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Action Toolbar (appears when one or more rows are selected) */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-center space-x-2 text-indigo-950 font-semibold text-sm">
            <CheckSquare className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>
              {selectedIds.size} {selectedIds.size === 1 ? 'employee' : 'employees'} selected
            </span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs bg-white text-slate-700 hover:bg-slate-50"
            >
              Clear Selection
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="flex items-center space-x-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.size})</span>
            </Button>
          </div>
        </div>
      )}

      {/* Directory Content / Table */}
      {isLoading ? (
        <Loading message="Fetching employee directory records..." />
      ) : employees.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No employees found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery || departmentFilter || statusFilter
              ? 'No staff members match the specified search or filter criteria. Try clearing filters.'
              : 'There are currently no staff members registered in the organization.'}
          </p>
          <div className="mt-5 flex items-center justify-center space-x-3">
            {searchQuery || departmentFilter || statusFilter ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setDepartmentFilter('');
                  setStatusFilter('');
                  setCurrentPage(1);
                  setSelectedIds(new Set());
                }}
              >
                Clear All Filters
              </Button>
            ) : (
              <>
                <Button onClick={handleOpenAddModal} size="sm">
                  Add First Employee
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center space-x-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import via CSV</span>
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          {/* Responsive Table Container */}
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left text-sm text-slate-600 divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  {/* Select All Checkbox */}
                  <th scope="col" className="px-4 py-3.5 w-10 text-center">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      onChange={handleToggleSelectAll}
                      aria-label="Select all employees on this page"
                      className="w-4 h-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3.5">ID</th>
                  <th scope="col" className="px-5 py-3.5">Full Name</th>
                  <th scope="col" className="px-5 py-3.5">Email</th>
                  <th scope="col" className="px-5 py-3.5">Phone</th>
                  <th scope="col" className="px-5 py-3.5">Department</th>
                  <th scope="col" className="px-5 py-3.5">Hire Date</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Salary</th>
                  <th scope="col" className="px-5 py-3.5 text-center">Status</th>
                  <th scope="col" className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => {
                  const isSelected = selectedIds.has(emp.id);
                  return (
                    <tr
                      key={emp.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/75'
                      }`}
                    >
                      {/* Row Checkbox */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(emp.id)}
                          aria-label={`Select ${emp.fullName}`}
                          className="w-4 h-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Employee ID */}
                      <td className="px-4 py-4 font-mono text-xs font-semibold text-slate-500">
                        #{emp.id}
                      </td>

                      {/* Full Name */}
                      <td className="px-5 py-4 font-medium text-slate-900 whitespace-nowrap">
                        {emp.fullName}
                      </td>

                      {/* Email */}
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{emp.email}</span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                        {emp.phone ? (
                          <div className="flex items-center space-x-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{emp.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Department */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5 text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium">{emp.departmentName ?? 'Unassigned'}</span>
                        </div>
                      </td>

                      {/* Hire Date */}
                      <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDateDisplay(emp.hireDate)}</span>
                        </div>
                      </td>

                      {/* Salary */}
                      <td className="px-5 py-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                        {formatINR(emp.salary)}
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        {renderStatusBadge(emp.status)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(emp)}
                            aria-label={`Edit ${emp.fullName}`}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit employee"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(emp)}
                            aria-label={`Delete ${emp.fullName}`}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete employee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Footer */}
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-600 bg-white">
            <div>
              <span>
                Showing{' '}
                <span className="font-semibold text-slate-900">
                  {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-slate-900">
                  {Math.min(currentPage * pageSize, totalCount)}
                </span>{' '}
                of <span className="font-semibold text-slate-900">{totalCount}</span> employees
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentPage((prev) => Math.max(prev - 1, 1));
                  setSelectedIds(new Set());
                }}
                disabled={currentPage <= 1}
                className="flex items-center space-x-1"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>

              <span className="px-3 text-xs font-semibold text-slate-500">
                Page {currentPage} of {Math.max(totalPages, 1)}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                  setSelectedIds(new Set());
                }}
                disabled={currentPage >= totalPages || totalPages === 0}
                className="flex items-center space-x-1"
                aria-label="Next page"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Add / Edit Employee Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 id="modal-title" className="text-lg font-bold text-slate-900 m-0">
                  {employeeToEdit ? 'Edit Employee Details' : 'Add New Employee'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {employeeToEdit
                    ? 'Update employee record and organizational status.'
                    : 'Fill in required information to register a new staff member.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isSaving && setIsModalOpen(false)}
                disabled={isSaving}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} noValidate className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label
                    htmlFor="emp-first-name"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="emp-first-name"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => {
                      setFormData({ ...formData, firstName: e.target.value });
                      if (formErrors.firstName) setFormErrors({ ...formErrors, firstName: '' });
                    }}
                    placeholder="Jane"
                    className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 ${
                      formErrors.firstName
                        ? 'border-rose-300 text-rose-900 focus:ring-rose-500'
                        : 'border-slate-200 text-slate-900 focus:ring-indigo-500'
                    }`}
                  />
                  {formErrors.firstName && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">
                      {formErrors.firstName}
                    </p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label
                    htmlFor="emp-last-name"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="emp-last-name"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => {
                      setFormData({ ...formData, lastName: e.target.value });
                      if (formErrors.lastName) setFormErrors({ ...formErrors, lastName: '' });
                    }}
                    placeholder="Doe"
                    className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 ${
                      formErrors.lastName
                        ? 'border-rose-300 text-rose-900 focus:ring-rose-500'
                        : 'border-slate-200 text-slate-900 focus:ring-indigo-500'
                    }`}
                  />
                  {formErrors.lastName && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">
                      {formErrors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email Address */}
                <div>
                  <label
                    htmlFor="emp-email"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Work Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="emp-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                    }}
                    placeholder="jane.doe@company.com"
                    className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 ${
                      formErrors.email
                        ? 'border-rose-300 text-rose-900 focus:ring-rose-500'
                        : 'border-slate-200 text-slate-900 focus:ring-indigo-500'
                    }`}
                  />
                  {formErrors.email && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.email}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label
                    htmlFor="emp-phone"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Phone Number
                  </label>
                  <input
                    id="emp-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                    }}
                    placeholder="+91 98765 43210"
                    className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 ${
                      formErrors.phone
                        ? 'border-rose-300 text-rose-900 focus:ring-rose-500'
                        : 'border-slate-200 text-slate-900 focus:ring-indigo-500'
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.phone}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Department Dropdown */}
                <div>
                  <label
                    htmlFor="emp-dept"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="emp-dept"
                    value={formData.departmentId}
                    onChange={(e) => {
                      setFormData({ ...formData, departmentId: e.target.value });
                      if (formErrors.departmentId) setFormErrors({ ...formErrors, departmentId: '' });
                    }}
                    className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 ${
                      formErrors.departmentId
                        ? 'border-rose-300 text-rose-900 focus:ring-rose-500'
                        : 'border-slate-200 text-slate-900 focus:ring-indigo-500'
                    }`}
                  >
                    <option value="">Select a Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.departmentId && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">
                      {formErrors.departmentId}
                    </p>
                  )}
                </div>

                {/* Employment Status */}
                <div>
                  <label
                    htmlFor="emp-status"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="emp-status"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as EmployeeStatus })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  >
                    <option value="Active">Active</option>
                    <option value="OnLeave">On Leave</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Hire Date */}
                <div>
                  <label
                    htmlFor="emp-hire-date"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Hire Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="emp-hire-date"
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => {
                      setFormData({ ...formData, hireDate: e.target.value });
                      if (formErrors.hireDate) setFormErrors({ ...formErrors, hireDate: '' });
                    }}
                    className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 ${
                      formErrors.hireDate
                        ? 'border-rose-300 text-rose-900 focus:ring-rose-500'
                        : 'border-slate-200 text-slate-900 focus:ring-indigo-500'
                    }`}
                  />
                  {formErrors.hireDate && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">
                      {formErrors.hireDate}
                    </p>
                  )}
                </div>

                {/* Salary (INR) */}
                <div>
                  <label
                    htmlFor="emp-salary"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Annual Salary (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <IndianRupee className="w-4 h-4" />
                    </div>
                    <input
                      id="emp-salary"
                      type="number"
                      step="1"
                      min="1"
                      value={formData.salary}
                      onChange={(e) => {
                        setFormData({ ...formData, salary: e.target.value });
                        if (formErrors.salary) setFormErrors({ ...formErrors, salary: '' });
                      }}
                      placeholder="850000"
                      className={`w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 ${
                        formErrors.salary
                          ? 'border-rose-300 text-rose-900 focus:ring-rose-500'
                          : 'border-slate-200 text-slate-900 focus:ring-indigo-500'
                      }`}
                    />
                  </div>
                  {formErrors.salary && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.salary}</p>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isSaving
                    ? 'Saving...'
                    : employeeToEdit
                    ? 'Update Employee'
                    : 'Create Employee'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation Dialog */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center space-x-3.5 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-xl">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <h3 id="delete-dialog-title" className="text-lg font-bold text-slate-900 m-0">
                  Confirm Employee Deletion
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-900 font-semibold">{deleteTarget.fullName}</strong>{' '}
              (ID: #{deleteTarget.id})? All historical attendance and payroll associations will be
              affected.
            </p>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => !isDeleting && setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                isLoading={isDeleting}
                onClick={handleConfirmDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete Employee'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {isBulkDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="bulk-delete-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center space-x-3.5 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 id="bulk-delete-title" className="text-lg font-bold text-slate-900 m-0">
                  Confirm Bulk Deletion
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Permanent batch removal</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-rose-600 font-bold">{selectedIds.size} selected employee(s)</strong>?
              This will remove their profile records, attendance logs, and payroll associations from
              the database. This action cannot be easily undone.
            </p>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => !isBulkDeleting && setIsBulkDeleteModalOpen(false)}
                disabled={isBulkDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                isLoading={isBulkDeleting}
                onClick={handleConfirmBulkDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                {isBulkDeleting ? 'Deleting Selected...' : `Delete ${selectedIds.size} Employees`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Create / CSV Import Modal */}
      {isImportModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-dialog-title"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="import-dialog-title" className="text-lg font-bold text-slate-900 m-0">
                    Import Employees via CSV
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Batch onboard staff records using formatted CSV data.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isImporting && setIsImportModalOpen(false)}
                disabled={isImporting}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Department Reference Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Valid Department IDs in System</span>
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {departments.map((d) => (
                    <span
                      key={d.id}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium"
                    >
                      ID <strong className="text-indigo-600 font-mono">{d.id}</strong>: {d.name}
                    </span>
                  ))}
                  {departments.length === 0 && (
                    <span className="text-slate-400">Loading departments...</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Each row's <code className="text-indigo-600 bg-indigo-50 px-1 rounded">DepartmentId</code> must match an existing numeric department ID shown above.
                </p>
              </div>

              {/* Template Download & Instructions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-indigo-900 m-0">Need the standard CSV structure?</h4>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    Download our ready-to-use CSV template pre-configured with the required headers.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 shrink-0 flex items-center space-x-1.5 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </Button>
              </div>

              {/* File Input Box */}
              <div>
                <label
                  htmlFor="csv-upload"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2"
                >
                  Select CSV File (.csv)
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-indigo-400 transition-colors bg-slate-50/50">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <label
                    htmlFor="csv-upload"
                    className="relative cursor-pointer font-semibold text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    <span>Click to browse</span>
                    <input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleCSVFileChange}
                      className="sr-only"
                    />
                  </label>
                  <p className="text-xs text-slate-500 mt-1">or drag and drop your .csv file here</p>
                  {importFile && (
                    <div className="mt-3 inline-flex items-center space-x-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                      <span>{importFile.name}</span>
                      <span className="text-slate-400">({(importFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Validation Status & Errors */}
              {importErrors.length > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-rose-800 text-xs font-bold uppercase tracking-wider">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>CSV Validation Issues ({importErrors.length})</span>
                  </div>
                  <ul className="text-xs text-rose-700 space-y-1 list-disc list-inside max-h-36 overflow-y-auto">
                    {importErrors.slice(0, 10).map((err, idx) => (
                      <li key={idx} className="leading-snug">
                        {err}
                      </li>
                    ))}
                    {importErrors.length > 10 && (
                      <li className="text-rose-500 italic">
                        ...and {importErrors.length - 10} more errors. Fix these before importing.
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Parsed Rows Preview */}
              {parsedRows.length > 0 && importErrors.length === 0 && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 text-emerald-800 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>{parsedRows.length}</strong> valid employee records parsed and ready for import.
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Validated
                  </span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end space-x-3 bg-slate-50/50">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsImportModalOpen(false)}
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                isLoading={isImporting}
                disabled={parsedRows.length === 0 || importErrors.length > 0 || isImporting}
                onClick={handleConfirmImport}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isImporting
                  ? 'Importing Employees...'
                  : parsedRows.length > 0
                  ? `Import ${parsedRows.length} Employees`
                  : 'Import Employees'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
