import { Module } from '@nestjs/common';
import { AuthCommonModule } from '../auth/auth-common.module';
import { DatabaseBackupsController } from './database-backups.controller';
import { DatabaseBackupsService } from './database-backups.service';

@Module({
  imports: [AuthCommonModule],
  controllers: [DatabaseBackupsController],
  providers: [DatabaseBackupsService],
})
export class DatabaseBackupsModule {}
