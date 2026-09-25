/**
 * Test the worked-days computation with mocked repository data.
 * Cover:
 *
 * All PRESENT → workedDays equals number of records
 *
 * Mix with HALF_DAY → workedDays is fractional
 *
 * All ABSENT → workedDays is 0
 *
 * Empty range → recordedDays is 0
 */

import { AttendanceService } from '../src/attendance/attendance.service';
import { Attendance } from '../src/attendance/attendance.entity';
import { Employee } from '../src/employees/employee.entity';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let repository: Repository<Attendance>;
  let employeeRepository: Repository<Employee>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: getRepositoryToken(Attendance),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Employee),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    repository = module.get<Repository<Attendance>>(getRepositoryToken(Attendance));
    employeeRepository = module.get<Repository<Employee>>(getRepositoryToken(Employee));
  });

  // Add your test cases here
  it('should compute workedDays correctly for all PRESENT', async () => {
    const records: Attendance[] = [
      { id: 1, status: 'PRESENT' } as unknown as Attendance,
      { id: 2, status: 'PRESENT' } as unknown as Attendance,
      { id: 3, status: 'PRESENT' } as unknown as Attendance,
    ];
    jest.spyOn(repository, 'find').mockResolvedValue(records);
    const result = await service.getWorkedDays('employee-1', '2026-01-01', '2026-01-31');
    expect(result.workedDays).toBe(records.length);
  });

  it('should compute workedDays correctly for mix of PRESENT and HALF_DAY', async () => {
    const records: Attendance[] = [
      { id: 1, status: 'PRESENT' } as unknown as Attendance,
      { id: 2, status: 'HALF_DAY' } as unknown as Attendance,
      { id: 3, status: 'PRESENT' } as unknown as Attendance,
    ];
    jest.spyOn(repository, 'find').mockResolvedValue(records);
    const result = await service.getWorkedDays('employee-1', '2026-01-01', '2026-01-31');
    expect(result.workedDays).toBe(2.5); // 2 full days + 0.5 for HALF_DAY
  });

  it('should compute workedDays correctly for all ABSENT', async () => {
    const records: Attendance[] = [
      { id: 1, status: 'ABSENT' } as unknown as Attendance,
      { id: 2, status: 'ABSENT' } as unknown as Attendance,
      { id: 3, status: 'ABSENT' } as unknown as Attendance,
    ];
    jest.spyOn(repository, 'find').mockResolvedValue(records);
    const result = await service.getWorkedDays('employee-1', '2026-01-01', '2026-01-31');
    expect(result.workedDays).toBe(0);
  });

  it('should compute workedDays correctly for empty range', async () => {
    const records: Attendance[] = [];
    jest.spyOn(repository, 'find').mockResolvedValue(records);
    const result = await service.getWorkedDays('employee-1', '2026-01-01', '2026-01-31');
    expect(result.workedDays).toBe(0);
  });

  it('should summarize attendance for a month', async () => {
    jest.spyOn(employeeRepository, 'findOne').mockResolvedValue({ id: 'employee-1' } as Employee);
    const records: Attendance[] = [
      { date: '2026-02-01', status: 'PRESENT' } as unknown as Attendance,
      { date: '2026-02-02', status: 'ABSENT' } as unknown as Attendance,
      { date: '2026-02-03', status: 'HALF_DAY' } as unknown as Attendance,
      { date: '2026-02-04', status: 'LEAVE' } as unknown as Attendance,
    ];
    jest.spyOn(repository, 'find').mockResolvedValue(records);

    await expect(service.getMonthlySummary('employee-1', 2026, 2)).resolves.toEqual({
      present: 1,
      absent: 1,
      halfDay: 1,
      leave: 1,
      notRecorded: 24,
      totalDaysInMonth: 28,
    });
    expect(repository.find).toHaveBeenCalledWith({
      where: { employeeId: 'employee-1', date: expect.anything() },
    });
  });

  it('should count only days on or after a mid-month joining date', async () => {
    jest.spyOn(employeeRepository, 'findOne').mockResolvedValue({
      id: 'employee-1',
      joinDate: '2026-02-11',
    } as Employee);
    jest
      .spyOn(repository, 'find')
      .mockResolvedValue([
        { date: '2026-02-11', status: 'PRESENT' } as Attendance,
        { date: '2026-02-12', status: 'ABSENT' } as Attendance,
      ]);

    await expect(service.getMonthlySummary('employee-1', 2026, 2)).resolves.toEqual({
      present: 1,
      absent: 1,
      halfDay: 0,
      leave: 0,
      notRecorded: 16,
      totalDaysInMonth: 18,
    });
    expect(repository.find).toHaveBeenCalledWith({
      where: { employeeId: 'employee-1', date: expect.anything() },
    });
  });

  it('should clip attendance range reads to the joining date', async () => {
    jest.spyOn(employeeRepository, 'findOne').mockResolvedValue({
      id: 'employee-1',
      joinDate: '2026-02-11',
    } as Employee);
    jest.spyOn(repository, 'find').mockResolvedValue([]);

    await service.findForEmployee('employee-1', '2026-02-01', '2026-02-28');

    expect(repository.find).toHaveBeenCalledWith({
      where: { employeeId: 'employee-1', date: expect.anything() },
      order: { date: 'ASC' },
    });
  });

  it('should reject single attendance before the joining date', async () => {
    jest.spyOn(employeeRepository, 'findOne').mockResolvedValue({
      id: 'employee-1',
      joinDate: '2026-02-11',
    } as Employee);
    const saveSpy = jest.spyOn(repository, 'save');

    await expect(
      service.upsert('employee-1', '2026-02-10', { status: 'PRESENT' }, 'admin'),
    ).rejects.toThrow('before the employee joining date');
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('should reject a bulk attendance batch containing a pre-join date', async () => {
    jest.spyOn(employeeRepository, 'findOne').mockResolvedValue({
      id: 'employee-1',
      joinDate: '2026-02-11',
    } as Employee);
    const saveSpy = jest.spyOn(repository, 'save');

    await expect(
      service.upsertBulk(
        'employee-1',
        {
          entries: [
            { date: '2026-02-11', status: 'PRESENT' },
            { date: '2026-02-10', status: 'PRESENT' },
          ],
        },
        'admin',
      ),
    ).rejects.toThrow('before the employee joining date');
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('should reject monthly summary for a missing employee', async () => {
    jest.spyOn(employeeRepository, 'findOne').mockResolvedValue(null);

    await expect(service.getMonthlySummary('missing', 2026, 2)).rejects.toThrow(
      'Employee not found',
    );
  });
});
