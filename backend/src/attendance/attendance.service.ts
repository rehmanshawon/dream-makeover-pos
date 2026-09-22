import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Attendance } from './attendance.entity';
import { AttendanceStatus } from './attendance-status.enum';
import { AttendanceResponseDto } from './dto/attendance-response.dto';
import { UpsertAttendanceDto } from './dto/upsert-attendance.dto';
import { AttendanceBulkDto } from './dto/attendance-bulk.dto';
import { Employee } from '../employees/employee.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  /**
   * Returns attendance records for an employee in a date range, inclusive.
   */
  async findForEmployee(
    employeeId: string,
    from: string,
    to: string,
  ): Promise<AttendanceResponseDto[]> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const records = await this.attendanceRepository.find({
      where: {
        employeeId,
        date: Between(from, to),
      },
      order: { date: 'ASC' },
    });
    return records.map((r) => this.toResponse(r));
  }

  /**
   * Creates or updates attendance for a single date.
   */
  async upsert(
    employeeId: string,
    date: string,
    dto: UpsertAttendanceDto,
    recordedBy: string,
  ): Promise<AttendanceResponseDto> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    let record = await this.attendanceRepository.findOne({
      where: { employeeId, date },
    });

    if (!record) {
      record = this.attendanceRepository.create({
        employeeId,
        date,
        status: dto.status,
        note: dto.note ?? null,
        recordedBy,
      });
    } else {
      record.status = dto.status;
      record.note = dto.note ?? null;
      record.recordedBy = recordedBy;
    }

    const saved = await this.attendanceRepository.save(record);
    return this.toResponse(saved);
  }

  /**
   * Bulk upsert for a single employee across many dates.
   */
  async upsertBulk(
    employeeId: string,
    dto: AttendanceBulkDto,
    recordedBy: string,
  ): Promise<AttendanceResponseDto[]> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const results: AttendanceResponseDto[] = [];
    for (const entry of dto.entries) {
      const saved = await this.upsert(
        employeeId,
        entry.date,
        { status: entry.status, ...(entry.note !== undefined ? { note: entry.note } : {}) },
        recordedBy,
      );
      results.push(saved);
    }
    return results;
  }

  /**
   * Deletes an attendance record.
   */
  async remove(employeeId: string, date: string): Promise<void> {
    const record = await this.attendanceRepository.findOne({
      where: { employeeId, date },
    });
    if (!record) return;
    await this.attendanceRepository.remove(record);
  }

  /**
   * Counts the equivalent worked days for an employee in a range.
   *
   * Returns:
   *   - workedDays: PRESENT + 0.5 * HALF_DAY + LEAVE
   *   - recordedDays: total number of attendance rows in the range
   *
   * If recordedDays is 0, the caller should treat the period as having
   * no attendance data and fall back to calendar-day proration.
   */
  async getWorkedDays(
    employeeId: string,
    from: string,
    to: string,
  ): Promise<{ workedDays: number; recordedDays: number }> {
    const records = await this.attendanceRepository.find({
      where: { employeeId, date: Between(from, to) },
    });

    let workedDays = 0;
    for (const r of records) {
      if (r.status === AttendanceStatus.PRESENT) workedDays += 1;
      else if (r.status === AttendanceStatus.HALF_DAY) workedDays += 0.5;
      else if (r.status === AttendanceStatus.LEAVE) workedDays += 1;
      // ABSENT contributes 0
    }

    return { workedDays, recordedDays: records.length };
  }

  private toResponse(record: Attendance): AttendanceResponseDto {
    return {
      id: record.id,
      employeeId: record.employeeId,
      date: record.date,
      status: record.status,
      note: record.note,
      recordedBy: record.recordedBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
