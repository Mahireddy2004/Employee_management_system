import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CalendarCheck,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { reportApi } from '../../api/reportApi';
import { Button } from '../../components/common/Button';

type ReportCategory = 'employees' | 'attendance' | 'payroll';
type ReportFormat = 'excel' | 'pdf';

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
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
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
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600',
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
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
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

    try {
      const result =
        format === 'excel'
          ? await reportApi.exportExcel(category)
          : await reportApi.exportPdf(category);

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

      const formatLabel = format === 'excel' ? 'Excel' : 'PDF';
      setFeedback({
        type: 'success',
        message: `${reportTitle} ${formatLabel} report downloaded successfully.`,
      });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">
            Reports & Exports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate and download publication-ready Excel spreadsheets and formatted PDF reports
            from live workforce data.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full font-medium">
          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Authenticated Role-Based Exports</span>
        </div>
      </div>

      {/* Global Feedback Banner */}
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

      {/* Three Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {REPORT_CARDS.map((report) => {
          const Icon = report.icon;
          const isExcelLoading = activeDownloads.has(`${report.id}-excel`);
          const isPdfLoading = activeDownloads.has(`${report.id}-pdf`);

          return (
            <div
              key={report.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
            >
              {/* Card Header & Content */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-2xl ${report.iconBg} ${report.iconColor}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {report.categoryLabel}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 m-0">{report.title}</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {report.description}
                  </p>
                </div>

                {/* Included Fields Section */}
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Included Information
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-600">
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
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5">
                  {/* Download Excel Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center justify-center space-x-2 py-2 hover:bg-emerald-50/50 hover:border-emerald-300 text-slate-700"
                    isLoading={isExcelLoading}
                    disabled={isExcelLoading}
                    onClick={() => handleDownload(report.id, 'excel', report.title)}
                    aria-label={`Download ${report.title} in Excel format`}
                  >
                    {!isExcelLoading && (
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <span className="font-semibold text-xs">
                      {isExcelLoading ? 'Generating...' : 'Download Excel'}
                    </span>
                  </Button>

                  {/* Download PDF Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center justify-center space-x-2 py-2 hover:bg-rose-50/50 hover:border-rose-300 text-slate-700"
                    isLoading={isPdfLoading}
                    disabled={isPdfLoading}
                    onClick={() => handleDownload(report.id, 'pdf', report.title)}
                    aria-label={`Download ${report.title} in PDF format`}
                  >
                    {!isPdfLoading && <FileText className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span className="font-semibold text-xs">
                      {isPdfLoading ? 'Generating...' : 'Download PDF'}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security & Format Compliance Notice Box */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            Excel files are generated using OpenXML (.xlsx) standard. PDF documents are formatted in
            high-resolution A4 landscape/portrait with QuestPDF.
          </span>
        </div>
        <span className="font-medium text-slate-600 shrink-0">Server-Rendered Engine</span>
      </div>
    </div>
  );
};

export default ReportsPage;
