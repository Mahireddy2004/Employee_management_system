import api from './axios';

export interface ReportDownloadResult {
  data: Blob;
  filename: string;
}

const parseFilename = (disposition: string | undefined, defaultFilename: string): string => {
  if (disposition) {
    const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
    if (match && match[1]) {
      return match[1].replace(/['"]/g, '').trim();
    }
  }
  return defaultFilename;
};

export const reportApi = {
  exportExcel: async (type: 'employees' | 'attendance' | 'payroll'): Promise<ReportDownloadResult> => {
    const response = await api.get<Blob>('/reports/export/excel', {
      params: { type },
      responseType: 'blob',
    });
    const disposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
    return {
      data: response.data,
      filename: parseFilename(disposition, `${type}_report.xlsx`),
    };
  },

  exportPdf: async (type: 'employees' | 'attendance' | 'payroll'): Promise<ReportDownloadResult> => {
    const response = await api.get<Blob>('/reports/export/pdf', {
      params: { type },
      responseType: 'blob',
    });
    const disposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
    return {
      data: response.data,
      filename: parseFilename(disposition, `${type}_report.pdf`),
    };
  },

  exportCsv: async (type: 'employees' | 'attendance' | 'payroll'): Promise<ReportDownloadResult> => {
    const response = await api.get<Blob>('/reports/export/csv', {
      params: { type },
      responseType: 'blob',
    });
    const disposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
    return {
      data: response.data,
      filename: parseFilename(disposition, `${type}_report.csv`),
    };
  },
};
