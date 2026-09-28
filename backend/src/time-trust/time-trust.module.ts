import { Global, Module } from '@nestjs/common';
import { TimeTrustController } from './time-trust.controller';
import { TimeTrustGuard } from './time-trust.guard';
import { TimeTrustService } from './time-trust.service';

@Global()
@Module({
  controllers: [TimeTrustController],
  providers: [TimeTrustService, TimeTrustGuard],
  exports: [TimeTrustService, TimeTrustGuard],
})
export class TimeTrustModule {}
