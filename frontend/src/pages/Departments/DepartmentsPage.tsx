import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  Code2,
  IndianRupee,
  Kanban,
  LayoutGrid,
  Mail,
  MapPin,
  Palette,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Server,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { departmentApi } from '../../api/departmentApi';
import { employeeApi } from '../../api/employeeApi';
import type {
  CreateDepartmentRequest,
  Department,
  UpdateDepartmentRequest,
} from '../../types/department';
import type { Employee } from '../../types/employee';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/Loading/Loading';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

/**
 * Formats numerical budget amounts into Indian Rupee (INR) format.
 * Example: 2500000 -> ₹25,00,000
 */
const formatINR = (value: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Splits comma-separated facilities string into clean badge tokens.
 */
const parseFacilities = (facStr?: string): string[] => {
  if (!facStr || !facStr.trim()) return [];
  return facStr
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);
};

/**
 * Recommended quick-add facilities for software offices
 */
const SUGGESTED_FACILITIES = [
  'Dual Monitors',
  'Dev Cloud Sandbox',
  'GitHub CI/CD',
  'HRMS Portal',
  'Biometric Access',
  'QA Test Rig',
  'Mobile Test Devices',
  'Figma Enterprise',
  'AWS/Azure Console',
  'High-Speed LAN',
  'Meeting Room',
  'Workstation Rig',
];

/**
 * Dynamic metadata and branding for software office divisions
 */
const getDepartmentMeta = (name: string) => {
  const lower = name.toLowerCase();
  if (
    lower.includes('human') ||
    lower.includes('hr') ||
    lower.includes('people') ||
    lower.includes('talent')
  ) {
    return {
      icon: Users,
      badgeColor: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      headerBg: 'bg-rose-500/10 border-rose-200 dark:border-rose-800/60',
      accentColor: 'text-rose-600 dark:text-rose-400',
      bgIcon: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300',
      label: 'HR & People Operations',
    };
  }
  if (
    lower.includes('software') ||
    lower.includes('dev') ||
    lower.includes('tech') ||
    lower.includes('engine')
  ) {
    return {
      icon: Code2,
      badgeColor: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      headerBg: 'bg-indigo-500/10 border-indigo-200 dark:border-indigo-800/60',
      accentColor: 'text-indigo-600 dark:text-indigo-400',
      bgIcon: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300',
      label: 'Software Engineering & Dev',
    };
  }
  if (
    lower.includes('qa') ||
    lower.includes('quality') ||
    lower.includes('test')
  ) {
    return {
      icon: CheckCircle2,
      badgeColor: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      headerBg: 'bg-emerald-500/10 border-emerald-200 dark:border-emerald-800/60',
      accentColor: 'text-emerald-600 dark:text-emerald-400',
      bgIcon: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300',
      label: 'Quality Assurance & Testing',
    };
  }
  if (
    lower.includes('devops') ||
    lower.includes('cloud') ||
    lower.includes('infra') ||
    lower.includes('server')
  ) {
    return {
      icon: Server,
      badgeColor: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
      headerBg: 'bg-cyan-500/10 border-cyan-200 dark:border-cyan-800/60',
      accentColor: 'text-cyan-600 dark:text-cyan-400',
      bgIcon: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-300',
      label: 'Cloud & DevOps Infrastructure',
    };
  }
  if (
    lower.includes('design') ||
    lower.includes('ui') ||
    lower.includes('ux') ||
    lower.includes('product')
  ) {
    return {
      icon: Palette,
      badgeColor: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      headerBg: 'bg-amber-500/10 border-amber-200 dark:border-amber-800/60',
      accentColor: 'text-amber-600 dark:text-amber-400',
      bgIcon: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300',
      label: 'UI/UX & Product Design',
    };
  }
  if (
    lower.includes('it') ||
    lower.includes('support') ||
    lower.includes('facilit')
  ) {
    return {
      icon: Wrench,
      badgeColor: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
      headerBg: 'bg-teal-500/10 border-teal-200 dark:border-teal-800/60',
      accentColor: 'text-teal-600 dark:text-teal-400',
      bgIcon: 'bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-300',
      label: 'IT Support & Office Facilities',
    };
  }
  return {
    icon: Building2,
    badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    headerBg: 'bg-slate-500/10 border-slate-200 dark:border-slate-800/60',
    accentColor: 'text-slate-600 dark:text-slate-400',
    bgIcon: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    label: 'Office Division',
  };
};

export const DepartmentsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const toast = useToast();

  // Data states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // View state: 'board' (Team Kanban Board) vs 'grid' (Summary Cards)
  const [viewMode, setViewMode] = useState<'board' | 'grid'>('board');

  // Client-side search state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal form states (Department Add / Edit)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [departmentToEdit, setDepartmentToEdit] = useState<Department | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formData, setFormData] = useState<{
    name: string;
    budget: string;
    location: string;
    facilities: string;
  }>({
    name: '',
    budget: '',
    location: '',
    facilities: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete department dialog state
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Employee Quick Reassign state
  const [reassignEmployee, setReassignEmployee] = useState<Employee | null>(null);
  const [targetDeptId, setTargetDeptId] = useState<number | ''>('');
  const [isReassigning, setIsReassigning] = useState<boolean>(false);

  // Employee Add & Delete states (Admin only)
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState<boolean>(false);
  const [addEmployeeDept, setAddEmployeeDept] = useState<Department | null>(null);
  const [isSavingEmployee, setIsSavingEmployee] = useState<boolean>(false);
  const [newEmployeeForm, setNewEmployeeForm] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    salary: string;
    hireDate: string;
    departmentId: number | '';
    status: 'Active' | 'OnLeave' | 'Terminated';
  }>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    salary: '50000',
    hireDate: new Date().toISOString().split('T')[0],
    departmentId: '',
    status: 'Active',
  });
  const [newEmployeeErrors, setNewEmployeeErrors] = useState<Record<string, string>>({});

  const [deleteEmployeeTarget, setDeleteEmployeeTarget] = useState<Employee | null>(null);
  const [isDeletingEmployee, setIsDeletingEmployee] = useState<boolean>(false);

  // Fetch departments and active employees list from backend API
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [deptData, empResult] = await Promise.all([
        departmentApi.getAll(),
        employeeApi.getAll({ pageSize: 100 }),
      ]);
      setDepartments(deptData);
      setEmployees(empResult.items ?? []);
    } catch (err: unknown) {
      console.error('Failed to load software office data:', err);
      setApiError(
        'Unable to load department and employee records. Please ensure the backend API server is running.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Create Department modal
  const handleOpenCreateModal = () => {
    setDepartmentToEdit(null);
    setFormData({
      name: '',
      budget: '',
      location: '',
      facilities: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Department modal
  const handleOpenEditModal = (dept: Department) => {
    setDepartmentToEdit(dept);
    setFormData({
      name: dept.name,
      budget: String(dept.budget),
      location: dept.location || '',
      facilities: dept.facilities || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Quick toggle suggested facility chip
  const handleToggleSuggestedFacility = (facility: string) => {
    const currentList = parseFacilities(formData.facilities);
    const exists = currentList.some((f) => f.toLowerCase() === facility.toLowerCase());
    let nextList: string[];
    if (exists) {
      nextList = currentList.filter((f) => f.toLowerCase() !== facility.toLowerCase());
    } else {
      nextList = [...currentList, facility];
    }
    setFormData({ ...formData, facilities: nextList.join(', ') });
  };

  // Validate form fields
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Department name is required.';
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Department name cannot exceed 100 characters.';
    }

    const parsedBudget = parseFloat(formData.budget);
    if (!formData.budget.trim() || isNaN(parsedBudget) || parsedBudget < 0) {
      errors.budget = 'Budget must be a non-negative number (0 or greater).';
    }

    if (!formData.location.trim()) {
      errors.location = 'Location / floor bay is required.';
    } else if (formData.location.trim().length > 150) {
      errors.location = 'Location cannot exceed 150 characters.';
    }

    if (formData.facilities && formData.facilities.length > 255) {
      errors.facilities = 'Facilities cannot exceed 255 characters.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Form Submit (Create / Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || isSaving) {
      return;
    }

    setIsSaving(true);
    const parsedBudget = parseFloat(formData.budget);

    try {
      if (departmentToEdit) {
        // Edit mode: PUT /api/departments/{id}
        const payload: UpdateDepartmentRequest = {
          name: formData.name.trim(),
          budget: parsedBudget,
          location: formData.location.trim(),
          facilities: formData.facilities.trim() || undefined,
        };
        await departmentApi.update(departmentToEdit.id, payload);
        toast.success(`Department "${formData.name.trim()}" updated successfully.`);
      } else {
        // Create mode: POST /api/departments
        const payload: CreateDepartmentRequest = {
          name: formData.name.trim(),
          budget: parsedBudget,
          location: formData.location.trim(),
          facilities: formData.facilities.trim() || undefined,
        };
        await departmentApi.create(payload);
        toast.success(`Department "${formData.name.trim()}" created successfully.`);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error('Failed to save department:', err);
      let errorMsg = 'Failed to save department details. Please try again.';

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response?: { status?: number; data?: { message?: string } };
        };
        if (axiosErr.response?.status === 409) {
          errorMsg = `A department with the name "${formData.name.trim()}" already exists.`;
        } else if (axiosErr.response?.data?.message) {
          errorMsg = axiosErr.response.data.message;
        }
      }

      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Confirmation Submit
  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;

    setIsDeleting(true);
    try {
      await departmentApi.delete(deleteTarget.id);
      toast.success(`Department "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      loadData();
    } catch (err: unknown) {
      console.error('Failed to delete department:', err);
      let errorMsg = 'Unable to delete department. Please try again.';

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response?: { status?: number; data?: { message?: string } };
        };
        if (axiosErr.response?.status === 400 && deleteTarget.employeeCount > 0) {
          errorMsg = 'This department cannot be deleted because employees are currently assigned to it.';
        } else if (axiosErr.response?.data?.message) {
          errorMsg = axiosErr.response.data.message;
        }
      }

      toast.error(errorMsg);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Quick Employee Department Reassignment
  const handleConfirmReassign = async () => {
    if (!reassignEmployee || !targetDeptId || isReassigning) return;

    setIsReassigning(true);
    try {
      await employeeApi.update(reassignEmployee.id, {
        firstName: reassignEmployee.firstName,
        lastName: reassignEmployee.lastName,
        email: reassignEmployee.email,
        phone: reassignEmployee.phone,
        hireDate: reassignEmployee.hireDate,
        salary: reassignEmployee.salary,
        departmentId: Number(targetDeptId),
        status: reassignEmployee.status,
      });

      const targetDept = departments.find((d) => d.id === Number(targetDeptId));
      toast.success(
        `${reassignEmployee.fullName} moved to ${targetDept?.name || 'new department'} successfully.`
      );
      setReassignEmployee(null);
      setTargetDeptId('');
      loadData();
    } catch (err: unknown) {
      console.error('Failed to reassign employee:', err);
      toast.error('Unable to reassign employee. Please try again.');
    } finally {
      setIsReassigning(false);
    }
  };

  // Handle Add Employee (Admin only)
  const handleOpenAddEmployeeModal = (dept: Department) => {
    setAddEmployeeDept(dept);
    setNewEmployeeForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      salary: '50000',
      hireDate: new Date().toISOString().split('T')[0],
      departmentId: dept.id,
      status: 'Active',
    });
    setNewEmployeeErrors({});
    setIsAddEmployeeModalOpen(true);
  };

  const handleSubmitAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!newEmployeeForm.firstName.trim()) errors.firstName = 'First name is required.';
    if (!newEmployeeForm.lastName.trim()) errors.lastName = 'Last name is required.';
    if (!newEmployeeForm.email.trim()) errors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmployeeForm.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }
    const sal = parseFloat(newEmployeeForm.salary);
    if (!newEmployeeForm.salary.trim() || isNaN(sal) || sal <= 0) {
      errors.salary = 'Salary must be greater than 0.';
    }
    if (!newEmployeeForm.departmentId) errors.departmentId = 'Department is required.';

    if (Object.keys(errors).length > 0) {
      setNewEmployeeErrors(errors);
      return;
    }

    setIsSavingEmployee(true);
    try {
      await employeeApi.create({
        firstName: newEmployeeForm.firstName.trim(),
        lastName: newEmployeeForm.lastName.trim(),
        email: newEmployeeForm.email.trim().toLowerCase(),
        phone: newEmployeeForm.phone.trim() || undefined,
        hireDate: newEmployeeForm.hireDate,
        salary: sal,
        departmentId: Number(newEmployeeForm.departmentId),
        status: newEmployeeForm.status,
      });
      toast.success(
        `Employee "${newEmployeeForm.firstName.trim()} ${newEmployeeForm.lastName.trim()}" added to ${
          addEmployeeDept?.name || 'department'
        } successfully.`
      );
      setIsAddEmployeeModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error('Failed to create employee:', err);
      let errorMsg = 'Failed to create employee. Please try again.';
      if (err && typeof err === 'object' && 'response' in err) {
        const ax = err as { response?: { data?: { message?: string } } };
        if (ax.response?.data?.message) errorMsg = ax.response.data.message;
      }
      toast.error(errorMsg);
    } finally {
      setIsSavingEmployee(false);
    }
  };

  // Handle Delete Employee (Admin only)
  const handleConfirmDeleteEmployee = async () => {
    if (!deleteEmployeeTarget || isDeletingEmployee) return;

    setIsDeletingEmployee(true);
    try {
      await employeeApi.delete(deleteEmployeeTarget.id);
      toast.success(
        `Employee "${deleteEmployeeTarget.fullName || `${deleteEmployeeTarget.firstName} ${deleteEmployeeTarget.lastName}`}" removed successfully.`
      );
      setDeleteEmployeeTarget(null);
      loadData();
    } catch (err: unknown) {
      console.error('Failed to delete employee:', err);
      let errorMsg = 'Unable to delete employee. Please try again.';
      if (err && typeof err === 'object' && 'response' in err) {
        const ax = err as { response?: { data?: { message?: string } } };
        if (ax.response?.data?.message) errorMsg = ax.response.data.message;
      }
      toast.error(errorMsg);
      setDeleteEmployeeTarget(null);
    } finally {
      setIsDeletingEmployee(false);
    }
  };

  // Filter departments by client-side search query
  const filteredDepartments = departments.filter((dept) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();
    const nameMatch = dept.name.toLowerCase().includes(query);
    const locationMatch = dept.location ? dept.location.toLowerCase().includes(query) : false;
    const facilitiesMatch = dept.facilities ? dept.facilities.toLowerCase().includes(query) : false;
    return nameMatch || locationMatch || facilitiesMatch;
  });

  // Calculate summary metrics
  const totalEmployees = employees.length;
  const totalBudget = departments.reduce((sum, d) => sum + d.budget, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-3.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 m-0">
              Department Board & Workforce Hub
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                isAdmin
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              {isAdmin ? 'Software Office Management' : 'Workforce Directory (View Only)'}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin
              ? 'Organize HR, Software Engineering, QA, Cloud, and Design teams with modern tech facilities.'
              : 'Browse software office divisions, tech facilities, team members, and workplace locations.'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'board'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Kanban className="w-4 h-4" />
              <span>Department Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Cards View</span>
            </button>
          </div>

          {isAdmin && (
            <Button
              onClick={handleOpenCreateModal}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department</span>
            </Button>
          )}
        </div>
      </div>

      {/* API Error Alert */}
      {apiError && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm font-medium m-0">{apiError}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="flex items-center space-x-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </Button>
        </div>
      )}

      {/* Overview Statistics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Divisions
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {departments.length}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Staff Members (HR & Devs)
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {totalEmployees}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Division Budget
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
              {formatINR(totalBudget)}
            </h3>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search divisions, floor locations, or facilities (e.g. Dual Monitors, HRMS)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 self-end sm:self-center">
          Showing {filteredDepartments.length} of {departments.length} divisions
        </div>
      </div>

      {/* Main Content Area: Board or Grid */}
      {isLoading ? (
        <Loading message="Loading software office departments and staff roster..." />
      ) : filteredDepartments.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            {searchQuery ? 'No matching divisions' : 'No departments configured'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            {searchQuery
              ? `No divisions matched "${searchQuery}". Try searching for HR, Software Development, or specific facilities.`
              : 'Add your first software office division to begin organizing teams and assigning facilities.'}
          </p>
          <div className="mt-5">
            {searchQuery ? (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            ) : isAdmin ? (
              <Button onClick={handleOpenCreateModal} size="sm">
                Add Department
              </Button>
            ) : null}
          </div>
        </div>
      ) : viewMode === 'board' ? (
        /* =================== DEPARTMENT BOARD (KANBAN STYLE) =================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {filteredDepartments.map((dept) => {
            const meta = getDepartmentMeta(dept.name);
            const Icon = meta.icon;
            const deptEmployees = employees.filter((e) => e.departmentId === dept.id);
            const facilitiesList = parseFacilities(dept.facilities);

            return (
              <div
                key={dept.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col transition-all hover:shadow-md"
              >
                {/* Board Column Header */}
                <div className={`p-4 border-b ${meta.headerBg}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2.5 rounded-xl ${meta.bgIcon}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                          {dept.name}
                        </h2>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mt-0.5">
                          {meta.label}
                        </span>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(dept)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit department"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(dept)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Delete department"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Location & Budget Row */}
                  <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-800/60 text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1 truncate max-w-[170px]">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      {dept.location || 'Software Bay'}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatINR(dept.budget)}
                    </span>
                  </div>

                  {/* Software Office Facilities Badges */}
                  {facilitiesList.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {facilitiesList.map((fac, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80"
                        >
                          {fac}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Team Members List */}
                <div className="p-4 space-y-3 flex-1 bg-slate-50/50 dark:bg-slate-950/30 min-h-[140px]">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
                    <span>Team Members</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                      {deptEmployees.length}
                    </span>
                  </div>

                  {deptEmployees.length === 0 ? (
                    <div className="text-center py-6 px-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-900/50">
                      <p className="text-xs text-slate-400 dark:text-slate-500 m-0">
                        No team members currently assigned.
                      </p>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleOpenAddEmployeeModal(dept)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-2 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Assign Staff Member</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    deptEmployees.map((emp) => {
                      const initial = emp.firstName ? emp.firstName.charAt(0).toUpperCase() : 'E';
                      const statusColor =
                        emp.status === 'Active'
                          ? 'bg-emerald-500 ring-emerald-200 dark:ring-emerald-900'
                          : emp.status === 'OnLeave'
                          ? 'bg-amber-500 ring-amber-200 dark:ring-amber-900'
                          : 'bg-rose-500 ring-rose-200 dark:ring-rose-900';

                      return (
                        <div
                          key={emp.id}
                          className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex items-start justify-between gap-2.5"
                        >
                          <div className="flex items-start space-x-2.5 min-w-0">
                            {/* Avatar with live status indicator */}
                            <div className="relative shrink-0 mt-0.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs select-none">
                                {initial}
                              </div>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ${statusColor}`}
                                title={`Status: ${emp.status}`}
                              />
                            </div>

                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate m-0">
                                {emp.fullName || `${emp.firstName} ${emp.lastName}`}
                              </h4>
                              <div className="flex items-center text-[11px] text-slate-500 dark:text-slate-400 gap-1.5 mt-0.5 truncate">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate">{emp.email}</span>
                              </div>
                              {emp.phone && (
                                <div className="flex items-center text-[11px] text-slate-400 dark:text-slate-500 gap-1.5 mt-0.5">
                                  <Phone className="w-3 h-3 shrink-0" />
                                  <span>{emp.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Admin Only Actions: Reassign & Delete Employee */}
                          {isAdmin && (
                            <div className="flex items-center space-x-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setReassignEmployee(emp);
                                  setTargetDeptId(emp.departmentId);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Reassign to another department"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteEmployeeTarget(emp)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Delete employee"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Board Column Footer Action (Admin Only) */}
                {isAdmin && (
                  <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
                    <button
                      type="button"
                      onClick={() => handleOpenAddEmployeeModal(dept)}
                      className="w-full py-1.5 px-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Member to {dept.name}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* =================== GRID CARDS VIEW =================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map((dept) => {
            const meta = getDepartmentMeta(dept.name);
            const Icon = meta.icon;
            const facilitiesList = parseFacilities(dept.facilities);

            return (
              <div
                key={dept.id}
                className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Top Strip */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-2xl ${meta.bgIcon}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        ID #{dept.id}
                      </span>
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.badgeColor}`}>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>
                          {dept.employeeCount} {dept.employeeCount === 1 ? 'Member' : 'Members'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Name & Subtitle */}
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
                    {dept.name}
                  </h3>
                  <span className="text-xs font-medium text-slate-400 block mt-0.5">
                    {meta.label}
                  </span>

                  {/* Location */}
                  <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-2">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                    <span>{dept.location || 'Headquarters'}</span>
                  </div>

                  {/* Facilities list */}
                  {facilitiesList.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Office Facilities & Tech Stack
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {facilitiesList.map((f, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[11px] border border-slate-200/80 dark:border-slate-700"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer with Budget and Actions */}
                <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider block">
                      Allocated Budget
                    </span>
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
                      {formatINR(dept.budget)}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(dept)}
                        aria-label={`Edit ${dept.name}`}
                        className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        title="Edit department"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(dept)}
                        aria-label={`Delete ${dept.name}`}
                        className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        title="Delete department"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =================== ADD / EDIT DEPARTMENT MODAL (Admin Only) =================== */}
      {isAdmin && isModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dept-modal-title"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h3 id="dept-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
                  {departmentToEdit ? 'Edit Department Profile' : 'Create Software Office Division'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure department division, office bay location, and tech facilities.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isSaving && setIsModalOpen(false)}
                disabled={isSaving}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} noValidate className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Department Name */}
              <div>
                <label
                  htmlFor="dept-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                >
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="dept-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                  }}
                  placeholder="e.g. Human Resources (HR), Software Development, QA"
                  className={`w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 ${
                    formErrors.name
                      ? 'border-rose-300 text-rose-900 focus:ring-rose-500'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.name}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <label
                  htmlFor="dept-location"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                >
                  Location / Office Bay <span className="text-rose-500">*</span>
                </label>
                <input
                  id="dept-location"
                  type="text"
                  value={formData.location}
                  onChange={(e) => {
                    setFormData({ ...formData, location: e.target.value });
                    if (formErrors.location) setFormErrors({ ...formErrors, location: '' });
                  }}
                  placeholder="e.g. Floor 2 - Development Bay, HR Suite - Floor 1"
                  className={`w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 ${
                    formErrors.location
                      ? 'border-rose-300 text-rose-900 focus:ring-rose-500'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                  }`}
                />
                {formErrors.location && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.location}</p>
                )}
              </div>

              {/* Annual Budget */}
              <div>
                <label
                  htmlFor="dept-budget"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                >
                  Annual Operational Budget (₹ INR) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                  <input
                    id="dept-budget"
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.budget}
                    onChange={(e) => {
                      setFormData({ ...formData, budget: e.target.value });
                      if (formErrors.budget) setFormErrors({ ...formErrors, budget: '' });
                    }}
                    placeholder="e.g. 500000"
                    className={`w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 ${
                      formErrors.budget
                        ? 'border-rose-300 text-rose-900 focus:ring-rose-500'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                    }`}
                  />
                </div>
                {formErrors.budget && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.budget}</p>
                )}
              </div>

              {/* Software Office Facilities Input */}
              <div>
                <label
                  htmlFor="dept-facilities"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                >
                  Office Facilities & Tech Stack
                </label>
                <input
                  id="dept-facilities"
                  type="text"
                  value={formData.facilities}
                  onChange={(e) => {
                    setFormData({ ...formData, facilities: e.target.value });
                    if (formErrors.facilities) setFormErrors({ ...formErrors, facilities: '' });
                  }}
                  placeholder="e.g. Dual Monitors, Dev Sandbox, GitHub CI/CD, HRMS Portal"
                  className={`w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 ${
                    formErrors.facilities
                      ? 'border-rose-300 text-rose-900 focus:ring-rose-500'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                  }`}
                />
                {formErrors.facilities && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.facilities}</p>
                )}

                {/* Suggested Facilities Chips */}
                <div className="mt-2.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Click to Add Suggested Software Facilities:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_FACILITIES.map((facility) => {
                      const active = parseFacilities(formData.facilities).some(
                        (f) => f.toLowerCase() === facility.toLowerCase()
                      );
                      return (
                        <button
                          key={facility}
                          type="button"
                          onClick={() => handleToggleSuggestedFacility(facility)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                            active
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-semibold'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {active ? `✓ ${facility}` : `+ ${facility}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSaving}
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {departmentToEdit ? 'Save Changes' : 'Create Division'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================== QUICK EMPLOYEE REASSIGN MODAL (Admin Only) =================== */}
      {isAdmin && reassignEmployee && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-fadeIn">
            <div className="flex items-start space-x-3">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                  Transfer / Reassign Employee
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Move <span className="font-semibold text-slate-800 dark:text-slate-200">{reassignEmployee.fullName}</span> to a different software office department.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReassignEmployee(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <label htmlFor="target-dept-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Target Department:
              </label>
              <select
                id="target-dept-select"
                aria-label="Select Target Department"
                value={targetDeptId}
                onChange={(e) => setTargetDeptId(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.location || 'Bay'})
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReassignEmployee(null)}
                disabled={isReassigning}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmReassign}
                isLoading={isReassigning}
                disabled={isReassigning || !targetDeptId}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Confirm Transfer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =================== DELETE DEPARTMENT DIALOG (Admin Only) =================== */}
      {isAdmin && deleteTarget && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-fadeIn">
            <div className="flex items-start space-x-3">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                  Delete Department
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Are you sure you want to remove{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    "{deleteTarget.name}"
                  </span>
                  ? This action cannot be reversed.
                </p>
                {deleteTarget.employeeCount > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      This department currently contains {deleteTarget.employeeCount} active member(s). Reassign them first.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
                disabled={isDeleting || deleteTarget.employeeCount > 0}
              >
                Delete Division
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =================== ADD EMPLOYEE MODAL (Admin Only) =================== */}
      {isAdmin && isAddEmployeeModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
                    Add Team Member
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Assign new employee to {addEmployeeDept?.name || 'department'}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSavingEmployee && setIsAddEmployeeModalOpen(false)}
                disabled={isSavingEmployee}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitAddEmployee} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newEmployeeForm.firstName}
                    onChange={(e) => {
                      setNewEmployeeForm({ ...newEmployeeForm, firstName: e.target.value });
                      if (newEmployeeErrors.firstName) setNewEmployeeErrors({ ...newEmployeeErrors, firstName: '' });
                    }}
                    placeholder="e.g. Rahul"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {newEmployeeErrors.firstName && (
                    <p className="text-xs text-rose-600 mt-1">{newEmployeeErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newEmployeeForm.lastName}
                    onChange={(e) => {
                      setNewEmployeeForm({ ...newEmployeeForm, lastName: e.target.value });
                      if (newEmployeeErrors.lastName) setNewEmployeeErrors({ ...newEmployeeErrors, lastName: '' });
                    }}
                    placeholder="e.g. Sharma"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {newEmployeeErrors.lastName && (
                    <p className="text-xs text-rose-600 mt-1">{newEmployeeErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Work Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmployeeForm.email}
                  onChange={(e) => {
                    setNewEmployeeForm({ ...newEmployeeForm, email: e.target.value });
                    if (newEmployeeErrors.email) setNewEmployeeErrors({ ...newEmployeeErrors, email: '' });
                  }}
                  placeholder="e.g. rahul.sharma@example.com"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {newEmployeeErrors.email && (
                  <p className="text-xs text-rose-600 mt-1">{newEmployeeErrors.email}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newEmployeeForm.phone}
                    onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Salary (₹ INR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newEmployeeForm.salary}
                    onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, salary: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {newEmployeeErrors.salary && (
                    <p className="text-xs text-rose-600 mt-1">{newEmployeeErrors.salary}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newEmployeeForm.departmentId}
                    onChange={(e) =>
                      setNewEmployeeForm({ ...newEmployeeForm, departmentId: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Hire Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newEmployeeForm.hireDate}
                    onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, hireDate: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddEmployeeModalOpen(false)}
                  disabled={isSavingEmployee}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSavingEmployee}
                  disabled={isSavingEmployee}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Add Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================== DELETE EMPLOYEE MODAL (Admin Only) =================== */}
      {isAdmin && deleteEmployeeTarget && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-fadeIn">
            <div className="flex items-start space-x-3">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                  Delete Employee
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Are you sure you want to remove{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    "{deleteEmployeeTarget.fullName || `${deleteEmployeeTarget.firstName} ${deleteEmployeeTarget.lastName}`}"
                  </span>{' '}
                  ({deleteEmployeeTarget.email}) from the organization?
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  This employee will be removed from their department and marked as terminated in the records.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteEmployeeTarget(null)}
                disabled={isDeletingEmployee}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmDeleteEmployee}
                isLoading={isDeletingEmployee}
                disabled={isDeletingEmployee}
              >
                Delete Employee
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsPage;
