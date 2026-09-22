export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  note: string | null;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
}

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  HALF_DAY: 'Half day',
  LEAVE: 'Leave',
};
