import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  IndianRupee,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { departmentApi } from '../../api/departmentApi';
import type {
  CreateDepartmentRequest,
  Department,
  UpdateDepartmentRequest,
} from '../../types/department';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/Loading/Loading';

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

export const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Client-side search state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [departmentToEdit, setDepartmentToEdit] = useState<Department | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formData, setFormData] = useState<{
    name: string;
    budget: string;
    location: string;
  }>({
    name: '',
    budget: '',
    location: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Auto-dismiss feedback alert after 5 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Fetch departments list from backend API
  const loadDepartments = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const data = await departmentApi.getAll();
      setDepartments(data);
    } catch (err: unknown) {
      console.error('Failed to load departments:', err);
      setApiError(
        'Unable to load departments. Please ensure the backend API server is running and authenticated.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  // Open Create Department modal
  const handleOpenCreateModal = () => {
    setDepartmentToEdit(null);
    setFormData({
      name: '',
      budget: '',
      location: '',
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
    });
    setFormErrors({});
    setIsModalOpen(true);
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
      errors.location = 'Location is required.';
    } else if (formData.location.trim().length > 150) {
      errors.location = 'Location cannot exceed 150 characters.';
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
        };
        await departmentApi.update(departmentToEdit.id, payload);
        setFeedback({
          type: 'success',
          message: `Department "${formData.name.trim()}" updated successfully.`,
        });
      } else {
        // Create mode: POST /api/departments
        const payload: CreateDepartmentRequest = {
          name: formData.name.trim(),
          budget: parsedBudget,
          location: formData.location.trim(),
        };
        await departmentApi.create(payload);
        setFeedback({
          type: 'success',
          message: `Department "${formData.name.trim()}" created successfully.`,
        });
      }

      setIsModalOpen(false);
      loadDepartments();
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

      setFeedback({ type: 'error', message: errorMsg });
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
      setFeedback({
        type: 'success',
        message: `Department "${deleteTarget.name}" deleted successfully.`,
      });
      setDeleteTarget(null);
      loadDepartments();
    } catch (err: unknown) {
      console.error('Failed to delete department:', err);
      let errorMsg = 'Unable to delete department. Please try again.';

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response?: { status?: number; data?: { message?: string } };
        };
        // Backend blocks deletion if employeeCount > 0 and responds with 400
        if (axiosErr.response?.status === 400 && deleteTarget.employeeCount > 0) {
          errorMsg = 'This department cannot be deleted because employees are currently assigned to it.';
        } else if (axiosErr.response?.data?.message) {
          errorMsg = axiosErr.response.data.message;
        }
      }

      setFeedback({ type: 'error', message: errorMsg });
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter departments by client-side search query (Name or Location)
  const filteredDepartments = departments.filter((dept) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();
    const nameMatch = dept.name.toLowerCase().includes(query);
    const locationMatch = dept.location ? dept.location.toLowerCase().includes(query) : false;
    return nameMatch || locationMatch;
  });

  // Calculate summary metrics
  const totalEmployees = departments.reduce((sum, d) => sum + d.employeeCount, 0);
  const totalBudget = departments.reduce((sum, d) => sum + d.budget, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">Departments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage organizational units, staffing capacity, locations, and allocated budgets.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleOpenCreateModal}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </Button>
        </div>
      </div>

      {/* Global Feedback Alert Banner */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-xl flex items-center justify-between shadow-xs transition-all animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
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
            aria-label="Dismiss notification"
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
          <Button
            variant="outline"
            size="sm"
            onClick={loadDepartments}
            className="flex items-center space-x-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </Button>
        </div>
      )}

      {/* Overview Statistics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Units
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{departments.length}</h3>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Assigned Personnel
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalEmployees}</h3>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Aggregate Budget
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5 truncate">
              {formatINR(totalBudget)}
            </h3>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by department name or location..."
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

        <div className="text-xs font-medium text-slate-500 self-end sm:self-center">
          Showing {filteredDepartments.length} of {departments.length} departments
        </div>
      </div>

      {/* Department Cards Grid */}
      {isLoading ? (
        <Loading message="Loading department records..." />
      ) : filteredDepartments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">
            {searchQuery ? 'No matching departments' : 'No departments found'}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? `No departments matched "${searchQuery}". Try clearing your search query.`
              : 'Create your first organizational department to begin assigning employees.'}
          </p>
          <div className="mt-5">
            {searchQuery ? (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            ) : (
              <Button onClick={handleOpenCreateModal} size="sm">
                Add Department
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map((dept) => (
            <div
              key={dept.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Card Top Strip */}
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                      ID #{dept.id}
                    </span>
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                      <Users className="w-3.5 h-3.5" />
                      <span>{dept.employeeCount} {dept.employeeCount === 1 ? 'Member' : 'Members'}</span>
                    </span>
                  </div>
                </div>

                {/* Name */}
                <h3 className="text-lg font-bold text-slate-900 m-0">{dept.name}</h3>

                {/* Location */}
                <div className="flex items-center text-xs text-slate-500 mt-2">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                  <span>{dept.location || 'Headquarters'}</span>
                </div>
              </div>

              {/* Card Footer with Budget and Actions */}
              <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider block">
                    Allocated Budget
                  </span>
                  <span className="text-base font-bold text-slate-900 mt-0.5 block">
                    {formatINR(dept.budget)}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(dept)}
                    aria-label={`Edit ${dept.name}`}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                    title="Edit department"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(dept)}
                    aria-label={`Delete ${dept.name}`}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title={
                      dept.employeeCount > 0
                        ? 'Contains active employees'
                        : 'Delete department'
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reusable Add / Edit Department Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dept-modal-title"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 id="dept-modal-title" className="text-lg font-bold text-slate-900 m-0">
                  {departmentToEdit ? 'Edit Department' : 'Create Department'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {departmentToEdit
                    ? 'Update department profile, location, and annual budget.'
                    : 'Establish a new organizational division for staffing assignment.'}
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
              {/* Department Name */}
              <div>
                <label
                  htmlFor="dept-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
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
                  placeholder="e.g. Engineering, Human Resources, Operations"
                  className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 ${
                    formErrors.name
                      ? 'border-rose-300 text-rose-900 focus:ring-rose-500'
                      : 'border-slate-200 text-slate-900 focus:ring-indigo-500'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.name}</p>
                )}
              </div>

              {/* Annual Budget (INR) */}
              <div>
                <label
                  htmlFor="dept-budget"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Annual Budget (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                  <input
                    id="dept-budget"
                    type="number"
                    step="1"
                    min="0"
                    value={formData.budget}
                    onChange={(e) => {
                      setFormData({ ...formData, budget: e.target.value });
                      if (formErrors.budget) setFormErrors({ ...formErrors, budget: '' });
                    }}
                    placeholder="2500000"
                    className={`w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 ${
                      formErrors.budget
                        ? 'border-rose-300 text-rose-900 focus:ring-rose-500'
                        : 'border-slate-200 text-slate-900 focus:ring-indigo-500'
                    }`}
                  />
                </div>
                {formErrors.budget && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.budget}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <label
                  htmlFor="dept-location"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Office Location <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    id="dept-location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => {
                      setFormData({ ...formData, location: e.target.value });
                      if (formErrors.location) setFormErrors({ ...formErrors, location: '' });
                    }}
                    placeholder="e.g. Bangalore Campus, Mumbai HQ, Floor 4"
                    className={`w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 ${
                      formErrors.location
                        ? 'border-rose-300 text-rose-900 focus:ring-rose-500'
                        : 'border-slate-200 text-slate-900 focus:ring-indigo-500'
                    }`}
                  />
                </div>
                {formErrors.location && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.location}</p>
                )}
              </div>

              {/* Modal Action Buttons */}
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
                    : departmentToEdit
                    ? 'Update Department'
                    : 'Create Department'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-dept-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center space-x-3.5 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 id="delete-dept-title" className="text-lg font-bold text-slate-900 m-0">
                  Delete Department
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Permanent organizational change</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete the{' '}
              <strong className="text-slate-900 font-semibold">{deleteTarget.name}</strong> department
              (ID #{deleteTarget.id})?
            </p>

            {/* Warning if employees are assigned */}
            {deleteTarget.employeeCount > 0 ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <strong>Restricted:</strong> This department currently contains{' '}
                  <span className="font-bold">{deleteTarget.employeeCount} active employee(s)</span>.
                  The server requires all personnel to be reassigned or deleted before this department
                  can be removed.
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                This unit currently has 0 assigned employees and can be safely removed.
              </p>
            )}

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
                className="bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsPage;
