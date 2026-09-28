import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

const CHECK_INTERVAL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 5_000;
const MAX_CLOCK_SKEW_MS = 2 * 60_000;
const OFFLINE_GRACE_HOURS = readPositiveHours(process.env.PAYROLL_OFFLINE_GRACE_HOURS, 8);
const WARNING_WINDOW_HOURS = readPositiveHours(process.env.PAYROLL_TIME_WARNING_HOURS, 2);
const OFFLINE_GRACE_MS = OFFLINE_GRACE_HOURS * 60 * 60_000;
const WARNING_WINDOW_MS = Math.min(WARNING_WINDOW_HOURS, OFFLINE_GRACE_HOURS) * 60 * 60_000;

function readPositiveHours(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export type TimeTrustState =
  'SYNCING' | 'ONLINE' | 'OFFLINE' | 'OFFLINE_WARNING' | 'LOCKED' | 'CLOCK_SKEW';

export interface TimeTrustStatus {
  state: TimeTrustState;
  payrollAllowed: boolean;
  warning: boolean;
  message: string | null;
  lastVerifiedAt: string | null;
  offlineForMs: number | null;
  remainingMs: number | null;
}

@Injectable()
export class TimeTrustService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TimeTrustService.name);
  private readonly syncUrl = process.env.TIME_SYNC_URL ?? 'https://www.google.com/generate_204';
  private timer: NodeJS.Timeout | undefined;
  private trustedUtcMs: number | null = null;
  private trustedMonotonicMs: number | null = null;
  private lastVerifiedAt: string | null = null;
  private clockSkewDetected = false;
  private checking = false;
  private syncFailureLogged = false;
  private sourceOnline = false;

  onModuleInit(): void {
    void this.checkTimeSource();
    this.timer = setInterval(() => void this.checkTimeSource(), CHECK_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async checkTimeSource(): Promise<void> {
    if (this.checking) return;
    this.checking = true;
    try {
      if (new URL(this.syncUrl).protocol !== 'https:') {
        throw new Error('TIME_SYNC_URL must use HTTPS.');
      }
      const response = await fetch(this.syncUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      await response.body?.cancel();
      const sourceTime = Date.parse(response.headers.get('date') ?? '');
      if (!response.ok || !Number.isFinite(sourceTime)) {
        throw new Error('Time source response did not include a valid HTTP Date header.');
      }

      const wallClockNow = Date.now();
      this.clockSkewDetected = Math.abs(wallClockNow - sourceTime) > MAX_CLOCK_SKEW_MS;
      this.trustedUtcMs = sourceTime;
      this.trustedMonotonicMs = this.monotonicNow();
      this.lastVerifiedAt = new Date(sourceTime).toISOString();
      this.syncFailureLogged = false;
      this.sourceOnline = true;

      if (this.clockSkewDetected) {
        this.logger.error(
          'System clock differs from verified network time by more than 2 minutes.',
        );
      }
    } catch (error) {
      this.sourceOnline = false;
      if (!this.syncFailureLogged) {
        this.logger.warn(
          `Unable to verify network time: ${error instanceof Error ? error.message : String(error)}`,
        );
        this.syncFailureLogged = true;
      }
    } finally {
      this.checking = false;
    }
  }

  getStatus(): TimeTrustStatus {
    const offlineForMs = this.getOfflineDuration();
    const trustedNow = this.getTrustedUtcNow();
    if (trustedNow !== null && Math.abs(Date.now() - trustedNow) > MAX_CLOCK_SKEW_MS) {
      this.clockSkewDetected = true;
    }

    if (this.clockSkewDetected) {
      return {
        state: 'CLOCK_SKEW',
        payrollAllowed: false,
        warning: true,
        message:
          'System date or time differs from verified time. Payroll is locked until time is corrected and re-verified online.',
        lastVerifiedAt: this.lastVerifiedAt,
        offlineForMs,
        remainingMs: 0,
      };
    }

    if (offlineForMs === null) {
      return {
        state: 'SYNCING',
        payrollAllowed: false,
        warning: true,
        message: 'Waiting for trusted network time. Payroll is temporarily unavailable.',
        lastVerifiedAt: null,
        offlineForMs: null,
        remainingMs: 0,
      };
    }

    const remainingMs = Math.max(0, OFFLINE_GRACE_MS - offlineForMs);
    if (remainingMs === 0) {
      return {
        state: 'LOCKED',
        payrollAllowed: false,
        warning: true,
        message: `Trusted time has been unavailable for ${OFFLINE_GRACE_HOURS} hours. Payroll is locked until network time is verified.`,
        lastVerifiedAt: this.lastVerifiedAt,
        offlineForMs,
        remainingMs,
      };
    }

    const warning = remainingMs <= WARNING_WINDOW_MS;
    return {
      state: warning ? 'OFFLINE_WARNING' : this.sourceOnline ? 'ONLINE' : 'OFFLINE',
      payrollAllowed: true,
      warning,
      message: warning
        ? 'Network time is unavailable. Payroll will be locked when the 8-hour verification window expires.'
        : null,
      lastVerifiedAt: this.lastVerifiedAt,
      offlineForMs,
      remainingMs,
    };
  }

  getTrustedNow(): Date | null {
    const status = this.getStatus();
    if (!status.payrollAllowed) return null;
    const trustedNow = this.getTrustedUtcNow();
    return trustedNow === null ? null : new Date(trustedNow);
  }

  private getTrustedUtcNow(): number | null {
    if (this.trustedUtcMs === null || this.trustedMonotonicMs === null) return null;
    return this.trustedUtcMs + (this.monotonicNow() - this.trustedMonotonicMs);
  }

  private getOfflineDuration(): number | null {
    if (this.trustedMonotonicMs === null) return null;
    return Math.max(0, this.monotonicNow() - this.trustedMonotonicMs);
  }

  private monotonicNow(): number {
    return Number(process.hrtime.bigint() / 1_000_000n);
  }
}
