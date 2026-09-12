import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { FinancialSummaryService } from '../src/reports/financial-summary.service';
import { DateRangePreset } from '../src/reports/dto/date-range-query.dto';

describe('FinancialSummaryService — resolveRange', () => {
  let service: FinancialSummaryService;

  beforeEach(async () => {
    const dataSource = {} as DataSource;
    const module: TestingModule = await Test.createTestingModule({
      providers: [FinancialSummaryService, { provide: DataSource, useValue: dataSource }],
    }).compile();
    service = module.get(FinancialSummaryService);
  });

  it('resolves custom range when both from and to provided', () => {
    const range = service.resolveRange({
      range: DateRangePreset.CUSTOM,
      from: '2026-01-01',
      to: '2026-01-31',
    });
    expect(range.from).toBe('2026-01-01');
    expect(range.to).toBe('2026-01-31');
  });

  it('rejects custom range missing from', () => {
    expect(() =>
      service.resolveRange({
        range: DateRangePreset.CUSTOM,
        to: '2026-01-31',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects custom range missing to', () => {
    expect(() =>
      service.resolveRange({
        range: DateRangePreset.CUSTOM,
        from: '2026-01-01',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects custom range with from after to', () => {
    expect(() =>
      service.resolveRange({
        range: DateRangePreset.CUSTOM,
        from: '2026-02-01',
        to: '2026-01-01',
      }),
    ).toThrow(BadRequestException);
  });

  it('resolves this_week to a Monday..Sunday interval', () => {
    // Freeze "now" to a Wednesday by mocking Date
    const wednesday = new Date('2026-06-17T10:00:00');
    jest.useFakeTimers().setSystemTime(wednesday);

    const range = service.resolveRange({ range: DateRangePreset.THIS_WEEK });

    // Monday of that week
    expect(range.from).toBe('2026-06-15');
    // Sunday of that week
    expect(range.to).toBe('2026-06-21');

    jest.useRealTimers();
  });

  it('resolves this_month to first..last day of current month', () => {
    const midMonth = new Date('2026-06-15T10:00:00');
    jest.useFakeTimers().setSystemTime(midMonth);

    const range = service.resolveRange({ range: DateRangePreset.THIS_MONTH });

    expect(range.from).toBe('2026-06-01');
    expect(range.to).toBe('2026-06-30');

    jest.useRealTimers();
  });

  it('resolves previous_month correctly', () => {
    const midMonth = new Date('2026-06-15T10:00:00');
    jest.useFakeTimers().setSystemTime(midMonth);

    const range = service.resolveRange({ range: DateRangePreset.PREVIOUS_MONTH });

    expect(range.from).toBe('2026-05-01');
    expect(range.to).toBe('2026-05-31');

    jest.useRealTimers();
  });

  it('handles February in a leap year for previous_month', () => {
    const march = new Date('2024-03-15T10:00:00');
    jest.useFakeTimers().setSystemTime(march);

    const range = service.resolveRange({ range: DateRangePreset.PREVIOUS_MONTH });

    expect(range.from).toBe('2024-02-01');
    expect(range.to).toBe('2024-02-29');

    jest.useRealTimers();
  });

  it('defaults to this_month when no range is provided', () => {
    const midMonth = new Date('2026-06-15T10:00:00');
    jest.useFakeTimers().setSystemTime(midMonth);

    const range = service.resolveRange({});

    expect(range.from).toBe('2026-06-01');
    expect(range.to).toBe('2026-06-30');

    jest.useRealTimers();
  });
});
