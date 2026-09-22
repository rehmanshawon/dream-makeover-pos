import { AttendanceStatus } from '../attendance-status.enum';

export class AttendanceResponseDto {
  id: string;
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  note: string | null;
  recordedBy: string;
  createdAt: Date;
  updatedAt: Date;
}
