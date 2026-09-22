import { IsArray, IsString, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpsertAttendanceDto } from './upsert-attendance.dto';

export class AttendanceBulkEntryDto extends UpsertAttendanceDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;
}

export class AttendanceBulkDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceBulkEntryDto)
  entries: AttendanceBulkEntryDto[];
}
