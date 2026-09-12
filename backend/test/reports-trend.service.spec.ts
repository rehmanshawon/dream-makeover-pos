import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { RevenueTrendService } from '../src/reports/revenue-trend.service';
import { FinancialSummaryService } from '../src/reports/financial-summary.service';

describe('RevenueTrendService', () => {
  let service: RevenueTrendService;
  let dataSource: DataSource;

  beforeEach(async () => {
    dataSource = {
      getRepository: jest.fn(),
    } as unknown as DataSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevenueTrendService,
        { provide: DataSource, useValue: dataSource },
        FinancialSummaryService,
      ],
    }).compile();

    service = module.get(RevenueTrendService);
  });

  it('includes zero-revenue days so charts have no gaps', async () => {
    const getRawMany = jest.fn().mockResolvedValue([
      { day: '2026-06-02', revenue: '100000', transactionCount: '3' },
      { day: '2026-06-04', revenue: '50000', transactionCount: '1' },
    ]);

    const createQueryBuilder = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany,
    });

    (dataSource.getRepository as jest.Mock).mockReturnValue({ createQueryBuilder });

    const result = await service.daily({
      range: 'custom' as any,
      from: '2026-06-01',
      to: '2026-06-04',
    });

    expect(result.points).toHaveLength(4);
    expect(result.points.map((p) => p.date)).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
    ]);
    expect(result.points[0].revenueMinor).toBe(0);
    expect(result.points[1].revenueMinor).toBe(100000);
    expect(result.points[2].revenueMinor).toBe(0);
    expect(result.points[3].revenueMinor).toBe(50000);
  });

  it('handles empty results gracefully', async () => {
    const createQueryBuilder = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    });

    (dataSource.getRepository as jest.Mock).mockReturnValue({ createQueryBuilder });

    const result = await service.daily({
      range: 'custom' as any,
      from: '2026-06-01',
      to: '2026-06-03',
    });

    expect(result.points).toHaveLength(3);
    expect(result.points.every((p) => p.revenueMinor === 0)).toBe(true);
  });
});
