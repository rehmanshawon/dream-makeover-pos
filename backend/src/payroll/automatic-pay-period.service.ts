import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PayPeriodsService } from './pay-periods.service';
import { TimeTrustService } from '../time-trust/time-trust.service';

const CHECK_INTERVAL_MS = 60_000;

export function businessYearMonth(date: Date, timeZone: string): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new Error(`Unable to determine current month in timezone ${timeZone}.`);
  }
  return { year, month };
}

@Injectable()
export class AutomaticPayPeriodService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomaticPayPeriodService.name);
  private readonly timeZone = process.env.BUSINESS_TIME_ZONE ?? 'Asia/Dhaka';
  private timer: NodeJS.Timeout | undefined;
  private checking = false;
  private catchUpComplete = false;

  constructor(
    private readonly payPeriodsService: PayPeriodsService,
    private readonly timeTrustService: TimeTrustService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.timeTrustService.getStatus().payrollAllowed) {
      const trustedNow = this.timeTrustService.getTrustedNow();
      if (trustedNow) this.catchUpComplete = await this.catchUpMissingPeriods(trustedNow);
      await this.ensureCurrentPeriod();
    }
    this.timer = setInterval(() => {
      void this.scheduledCheck();
    }, CHECK_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async ensureCurrentPeriod(): Promise<void> {
    if (this.checking) return;
    this.checking = true;
    try {
      if (this.timeTrustService.getStatus().payrollAllowed) {
        const trustedNow = this.timeTrustService.getTrustedNow();
        if (trustedNow) await this.ensurePeriodForDate(trustedNow);
      }
    } catch (error) {
      this.logger.error(
        'Unable to ensure the current business-month pay period; it will retry shortly.',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.checking = false;
    }
  }

  private async scheduledCheck(): Promise<void> {
    if (this.checking) return;
    this.checking = true;
    try {
      if (!this.timeTrustService.getStatus().payrollAllowed) return;
      const trustedNow = this.timeTrustService.getTrustedNow();
      if (!trustedNow) return;
      if (!this.catchUpComplete) {
        this.catchUpComplete = await this.catchUpMissingPeriods(trustedNow);
      }
      await this.ensurePeriodForDate(trustedNow);
    } catch (error) {
      this.logger.error(
        'Unable to ensure the current business-month pay period; it will retry shortly.',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.checking = false;
    }
  }

  private async ensurePeriodForDate(date: Date): Promise<void> {
    const { year, month } = businessYearMonth(date, this.timeZone);
    const period = await this.payPeriodsService.ensurePeriodExists(year, month);
    this.logger.log(`Pay period ready: ${period.name} (${this.timeZone}).`);
  }

  private async catchUpMissingPeriods(date: Date): Promise<boolean> {
    try {
      const { year, month } = businessYearMonth(date, this.timeZone);
      await this.payPeriodsService.ensureMissingPeriodsThrough(year, month);
      return true;
    } catch (error) {
      this.logger.error(
        'Unable to catch up missing business-month pay periods; it will retry shortly.',
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
