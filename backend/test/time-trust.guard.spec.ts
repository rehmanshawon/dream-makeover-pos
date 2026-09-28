import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { TimeTrustGuard } from '../src/time-trust/time-trust.guard';
import { TimeTrustService } from '../src/time-trust/time-trust.service';

describe('TimeTrustGuard', () => {
  it('rejects payroll requests when time is untrusted', () => {
    const service = {
      getStatus: jest.fn(() => ({
        payrollAllowed: false,
        message: 'Trusted time is unavailable.',
      })),
    } as unknown as TimeTrustService;

    expect(() => new TimeTrustGuard(service).canActivate()).toThrow(ServiceUnavailableException);
  });

  it('allows payroll requests while the trusted-time lease is valid', () => {
    const service = {
      getStatus: jest.fn(() => ({ payrollAllowed: true, message: null })),
    } as unknown as TimeTrustService;

    expect(new TimeTrustGuard(service).canActivate()).toBe(true);
  });
});
