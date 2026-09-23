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

  upsertBulk(
    employeeId: string,
    entries: Array<{ date: string; status: AttendanceStatus }>,
  ): Promise<AttendanceRecord[]> {
    return api.post<AttendanceRecord[]>(`/attendance/employee/${employeeId}/bulk`, { entries });
  },

  summary(
    employeeId: string,
    year: number,
    month: number,
  ): Promise<{
    present: number;
    absent: number;
    halfDay: number;
    leave: number;
    notRecorded: number;
    totalDaysInMonth: number;
  }> {
    return api.get(`/attendance/employee/${employeeId}/summary?year=${year}&month=${month}`);
  },
};
