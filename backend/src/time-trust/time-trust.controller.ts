import { Controller, Get } from '@nestjs/common';
import { TimeTrustService, TimeTrustStatus } from './time-trust.service';

@Controller('system/time-trust')
export class TimeTrustController {
  constructor(private readonly timeTrustService: TimeTrustService) {}

  @Get()
  getStatus(): TimeTrustStatus {
    return this.timeTrustService.getStatus();
  }
}
