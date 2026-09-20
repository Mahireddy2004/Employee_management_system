import api from './axios';

export interface ReportDownloadResult {
  data: Blob;
  filename: string;
}

export const reportApi = {
  exportExcel: async (type: 'employees' | 'attendance' | 'payroll'): Promise<ReportDownloadResult> => {
    const response = await api.get<Blob>('/reports/export/excel', {
      params: { type },
      responseType: 'blob',
    });

    const disposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
    let filename = `${type}_report.xlsx`;
    if (disposition) {
      const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '').trim();
      }
    }

    return {
      data: response.data,
      filename,
    };
  },

  exportPdf: async (type: 'employees' | 'attendance' | 'payroll'): Promise<ReportDownloadResult> => {
    const response = await api.get<Blob>('/reports/export/pdf', {
      params: { type },
      responseType: 'blob',
    });

    const disposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
    let filename = `${type}_report.pdf`;
    if (disposition) {
      const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '').trim();
      }
    }

    return {
      data: response.data,
      filename,
    };
  },
};
