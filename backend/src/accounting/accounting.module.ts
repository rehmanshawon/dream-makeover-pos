import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthCommonModule } from '../auth/auth-common.module';
import { Account } from './account.entity';
import { JournalEntry } from './journal-entry.entity';
import { JournalLine } from './journal-line.entity';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';

@Module({
  imports: [TypeOrmModule.forFeature([Account, JournalEntry, JournalLine]), AuthCommonModule],
  controllers: [AccountingController],
  providers: [AccountingService],
})
export class AccountingModule {}
