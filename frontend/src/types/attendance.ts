export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface Attendance {
  id: number;
  employeeId: number;
  employeeName?: string;
  employeeEmail?: string;
  date: string;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
}

export interface CreateAttendanceRequest {
  employeeId: number;
  date: string;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
}

export interface UpdateAttendanceRequest {
  date: string;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
}

export interface AttendanceQueryParams {
  employeeId?: number;
  date?: string;
  status?: string;
}
