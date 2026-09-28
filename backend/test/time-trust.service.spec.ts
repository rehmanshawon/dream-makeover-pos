import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TimeTrustService } from '../src/time-trust/time-trust.service';

describe('TimeTrustService', () => {
  let service: TimeTrustService;
  let monotonicMs: number;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-25T12:00:00.000Z'));
    service = new TimeTrustService();
    monotonicMs = 1_000;
    jest
      .spyOn(service as unknown as { monotonicNow: () => number }, 'monotonicNow')
      .mockImplementation(() => monotonicMs);
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('fails closed until network time has been verified', () => {
    expect(service.getStatus()).toMatchObject({
      state: 'SYNCING',
      payrollAllowed: false,
    });
  });

  it('allows payroll after a successful trusted-time check', async () => {
    fetchSpy.mockResolvedValue(
      new Response(null, {
        status: 204,
        headers: { date: new Date().toUTCString() },
      }),
    );

    await service.checkTimeSource();

    expect(service.getStatus()).toMatchObject({
      state: 'ONLINE',
      payrollAllowed: true,
      warning: false,
    });
  });

  it('warns after six offline hours and locks payroll after eight', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(null, {
        status: 204,
        headers: { date: new Date().toUTCString() },
      }),
    );
    await service.checkTimeSource();

    monotonicMs += 6 * 60 * 60_000;
    jest.setSystemTime(new Date('2026-09-25T18:00:00.000Z'));
    fetchSpy.mockRejectedValueOnce(new Error('offline'));
    await service.checkTimeSource();

    expect(service.getStatus()).toMatchObject({
      state: 'OFFLINE_WARNING',
      payrollAllowed: true,
      warning: true,
    });

    monotonicMs += 2 * 60 * 60_000;
    jest.setSystemTime(new Date('2026-09-25T20:00:00.000Z'));
    expect(service.getStatus()).toMatchObject({
      state: 'LOCKED',
      payrollAllowed: false,
      warning: true,
    });
  });

  it('locks payroll immediately when the machine clock jumps', async () => {
    fetchSpy.mockResolvedValue(
      new Response(null, {
        status: 204,
        headers: { date: new Date().toUTCString() },
      }),
    );
    await service.checkTimeSource();

    jest.setSystemTime(new Date('2026-09-25T12:10:00.000Z'));

    expect(service.getStatus()).toMatchObject({
      state: 'CLOCK_SKEW',
      payrollAllowed: false,
    });
  });
});
