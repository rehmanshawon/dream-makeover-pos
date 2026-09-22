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
});
