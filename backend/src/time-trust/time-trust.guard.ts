import { CanActivate, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { TimeTrustService } from './time-trust.service';

@Injectable()
export class TimeTrustGuard implements CanActivate {
  constructor(private readonly timeTrustService: TimeTrustService) {}

  canActivate(): boolean {
    const status = this.timeTrustService.getStatus();
    if (!status.payrollAllowed) {
      throw new ServiceUnavailableException(status.message ?? 'Payroll is temporarily locked.');
    }
    return true;
  }
}
