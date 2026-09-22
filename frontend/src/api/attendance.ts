import { api } from './api-client';
import type { AttendanceRecord, AttendanceStatus } from '../types/attendance';

export const attendanceApi = {
  listForEmployee(employeeId: string, from: string, to: string): Promise<AttendanceRecord[]> {
    return api.get<AttendanceRecord[]>(`/attendance/employee/${employeeId}?from=${from}&to=${to}`);
  },

  upsert(
    employeeId: string,
    date: string,
    status: AttendanceStatus,
    note?: string,
  ): Promise<AttendanceRecord> {
    return api.put<AttendanceRecord>(`/attendance/employee/${employeeId}/${date}`, {
      status,
      ...(note ? { note } : {}),
    });
  },

  remove(employeeId: string, date: string): Promise<void> {
    return api.delete<void>(`/attendance/employee/${employeeId}/${date}`);
  },
};
