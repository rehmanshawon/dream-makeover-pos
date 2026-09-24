import { describe, expect, it, jest } from '@jest/globals';
import {
  AutomaticPayPeriodService,
  businessYearMonth,
} from '../src/payroll/automatic-pay-period.service';
import { PayPeriodsService } from '../src/payroll/pay-periods.service';
import { PayPeriodStatus } from '../src/payroll/pay-period-status.enum';

describe('AutomaticPayPeriodService', () => {
  it('uses the business timezone when determining the current month', () => {
    expect(businessYearMonth(new Date('2026-09-30T19:00:00.000Z'), 'Asia/Dhaka')).toEqual({
      year: 2026,
      month: 10,
    });
  });

  it('catches up missing periods and ensures the current period at startup', async () => {
    const currentPeriod = {
      id: 'october-2026',
      name: 'October 2026',
      status: PayPeriodStatus.OPEN,
    };
    const payPeriodsService = {
      ensureMissingPeriodsThrough: jest.fn(async () => undefined),
      ensurePeriodExists: jest.fn(async () => currentPeriod),
    } as unknown as PayPeriodsService;
    const service = new AutomaticPayPeriodService(payPeriodsService);

    await service.onModuleInit();
    service.onModuleDestroy();

    expect(payPeriodsService.ensureMissingPeriodsThrough).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
    );
    expect(payPeriodsService.ensurePeriodExists).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
    );
  });
});
