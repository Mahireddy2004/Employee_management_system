import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { reportApi } from '../../api/reportApi';
import { Button } from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';

type ReportCategory = 'employees' | 'attendance' | 'payroll';
type ReportFormat = 'excel' | 'pdf' | 'csv';

interface ReportCardConfig {
  id: ReportCategory;
  title: string;
  categoryLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  description: string;
  includedFields: string[];
}

const REPORT_CARDS: ReportCardConfig[] = [
  {
    id: 'employees',
    title: 'Employee Directory Report',
    categoryLabel: 'Workforce Profile',
    icon: Users,
    iconBg: 'bg-blue-50 dark:bg-blue-950/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
    description:
      'Export comprehensive employee directory information, departmental assignments, and organizational statuses.',
    includedFields: [
      'Employee ID, First & Last Name',
      'Contact Email & Phone Number',
      'Assigned Department',
      'Hire Date & Length of Service',
      'Annual Salary & Status (Active/OnLeave/Terminated)',
    ],
  },
  {
    id: 'attendance',
    title: 'Attendance Activity Report',
    categoryLabel: 'Operations & Timesheets',
    icon: CalendarCheck,
    iconBg: 'bg-teal-50 dark:bg-teal-950/50',
    iconColor: 'text-teal-600 dark:text-teal-400',
    description:
      'Detailed log of daily workforce attendance records, shift check-ins, check-outs, and absence classifications.',
    includedFields: [
      'Employee Record & Identification',
      'Log Date (Trailing 14+ Days)',
      'Status (Present, Absent, Late, Excused)',
      'Check-In & Check-Out Timestamps',
      'Shift Duration & Daily Summary',
    ],
  },
  {
    id: 'payroll',
    title: 'Payroll & Compensation Report',
    categoryLabel: 'Finance & Compensation',
    icon: IndianRupee,
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    description:
      'Financial breakdown of active employee salaries, gross monthly disbursements, estimated withholdings, and totals.',
    includedFields: [
      'Employee Name & Department',
      'Annual Base Compensation',
      'Calculated Monthly Gross',
      'Estimated Statutory Withholding (15%)',
      'Net Monthly Pay & Organization Grand Totals',
    ],
  },
];

export const ReportsPage: React.FC = () => {
  const toast = useToast();
  // Set of actively downloading report keys, e.g. "employees-excel"
  const [activeDownloads, setActiveDownloads] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Auto-dismiss feedback alert after 5 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleDownload = async (category: ReportCategory, format: ReportFormat, reportTitle: string) => {
    const downloadKey = `${category}-${format}`;
    if (activeDownloads.has(downloadKey)) return;

    // Mark only this specific button as downloading
    setActiveDownloads((prev) => new Set(prev).add(downloadKey));
    setFeedback(null);
    toast.info(`Generating ${reportTitle} (${format.toUpperCase()})...`, 2500);

    try {
      const result =
        format === 'excel'
          ? await reportApi.exportExcel(category)
          : format === 'pdf'
          ? await reportApi.exportPdf(category)
          : await reportApi.exportCsv(category);

      const { data: blob, filename } = result;

      if (!blob || blob.size === 0) {
        throw new Error('Received an empty file response from the server.');
      }

      // Trigger browser native file download using a temporary object URL
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      const formatLabel = format === 'excel' ? 'Excel' : format === 'pdf' ? 'PDF' : 'CSV';
      const successMessage = `${reportTitle} ${formatLabel} report downloaded successfully.`;
      setFeedback({
        type: 'success',
        message: successMessage,
      });
      toast.success(successMessage);
    } catch (err: unknown) {
      console.error(`Failed to export ${category} report:`, err);
      let errorMsg = `Unable to generate ${reportTitle} (${format.toUpperCase()}). Please try again.`;

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response?: { status?: number; data?: unknown };
        };

        if (axiosErr.response?.status === 401) {
          errorMsg = 'Your session has expired. Please sign in again to export reports.';
        } else if (axiosErr.response?.status === 403) {
          errorMsg = 'You do not have permission to download this report.';
        } else if (axiosErr.response?.data instanceof Blob) {
          try {
            const errorText = await axiosErr.response.data.text();
            const parsed = JSON.parse(errorText);
            if (parsed.message) errorMsg = parsed.message;
          } catch {
            // Keep user-friendly fallback
          }
        }
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }

      setFeedback({
        type: 'error',
        message: errorMsg,
      });
      toast.error(errorMsg);
    } finally {
      // Remove loading indicator for this specific action
      setActiveDownloads((prev) => {
        const next = new Set(prev);
        next.delete(downloadKey);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 m-0">
            Reports & Exports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Generate and download publication-ready Excel spreadsheets and formatted PDF reports
            from live workforce data.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 px-3 py-1.5 rounded-full font-medium">
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>Authenticated Role-Based Exports</span>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-xl flex items-center justify-between shadow-xs transition-all animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
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
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Three Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {REPORT_CARDS.map((report) => {
          const Icon = report.icon;
          const isExcelLoading = activeDownloads.has(`${report.id}-excel`);
          const isPdfLoading = activeDownloads.has(`${report.id}-pdf`);
          const isCsvLoading = activeDownloads.has(`${report.id}-csv`);

          return (
            <div
              key={report.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
            >
              {/* Card Header & Content */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-2xl ${report.iconBg} ${report.iconColor}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {report.categoryLabel}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 m-0">{report.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    {report.description}
                  </p>
                </div>

                {/* Included Fields Section */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    Included Information
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {report.includedFields.map((field, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                        <span className="leading-snug">{field}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-6 pt-0 mt-2">
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    {/* Download Excel Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full flex items-center justify-center space-x-2 py-2 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/40 hover:border-emerald-300 dark:hover:border-emerald-700 text-slate-700 dark:text-slate-200"
                      isLoading={isExcelLoading}
                      disabled={isExcelLoading || isPdfLoading || isCsvLoading}
                      onClick={() => handleDownload(report.id, 'excel', report.title)}
                      aria-label={`Download ${report.title} in Excel format`}
                    >
                      {!isExcelLoading && (
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      <span className="font-semibold text-xs">
                        {isExcelLoading ? 'Generating...' : 'Excel'}
                      </span>
                    </Button>

                    {/* Download PDF Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full flex items-center justify-center space-x-2 py-2 hover:bg-rose-50/50 dark:hover:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-700 text-slate-700 dark:text-slate-200"
                      isLoading={isPdfLoading}
                      disabled={isExcelLoading || isPdfLoading || isCsvLoading}
                      onClick={() => handleDownload(report.id, 'pdf', report.title)}
                      aria-label={`Download ${report.title} in PDF format`}
                    >
                      {!isPdfLoading && <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />}
                      <span className="font-semibold text-xs">
                        {isPdfLoading ? 'Generating...' : 'PDF'}
                      </span>
                    </Button>
                  </div>

                  {/* Download CSV Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center justify-center space-x-2 py-2 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 text-slate-700 dark:text-slate-200"
                    isLoading={isCsvLoading}
                    disabled={isExcelLoading || isPdfLoading || isCsvLoading}
                    onClick={() => handleDownload(report.id, 'csv', report.title)}
                    aria-label={`Download ${report.title} in CSV format`}
                  >
                    {!isCsvLoading && <Download className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                    <span className="font-semibold text-xs">
                      {isCsvLoading ? 'Generating...' : 'Download CSV (.csv)'}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security & Format Compliance Notice Box */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <span>
            Excel files are generated using OpenXML (.xlsx) standard. PDF documents are formatted in
            high-resolution A4 landscape/portrait with QuestPDF.
          </span>
        </div>
        <span className="font-medium text-slate-600 dark:text-slate-400 shrink-0">Server-Rendered Engine</span>
      </div>
    </div>
  );
};

export default ReportsPage;
