import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { AttendanceStatus } from '../attendance-status.enum';

export class UpsertAttendanceDto {
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  note?: string;
}
