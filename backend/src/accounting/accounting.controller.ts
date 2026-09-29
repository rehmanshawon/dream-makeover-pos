import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import type { JwtPayload } from '../auth/jwt.strategy';
import { TimeTrustGuard } from '../time-trust/time-trust.guard';
import { AccountingService } from './accounting.service';
import { AccountingJournalQueryDto } from './dto/accounting-journal-query.dto';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { CreateBankReconciliationDto } from './dto/create-bank-reconciliation.dto';
import { BankReconciliationQueryDto } from './dto/bank-reconciliation-query.dto';
import { AccountingAsOfQueryDto } from './dto/accounting-as-of-query.dto';

@Controller('accounting')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('accounts')
  getAccounts() {
    return this.accountingService.getAccounts();
  }

  @Get('trial-balance')
  getTrialBalance(@Query() query: AccountingAsOfQueryDto) {
    return this.accountingService.getTrialBalance(query.asOf);
  }

  @Get('balance-sheet')
  getBalanceSheet(@Query() query: AccountingAsOfQueryDto) {
    return this.accountingService.getBalanceSheet(query.asOf);
  }

  @Get('journal')
  getJournal(@Query() query: AccountingJournalQueryDto) {
    return this.accountingService.getJournal(query);
  }

  @Get('reconciliation')
  getBankReconciliation(@Query() query: BankReconciliationQueryDto) {
    return this.accountingService.getBankReconciliation(query.statementDate);
  }

  @Post('reconciliation')
  createBankReconciliation(
    @Body() dto: CreateBankReconciliationDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.accountingService.createBankReconciliation(dto, req.user.username);
  }

  @Post('vouchers')
  @UseGuards(TimeTrustGuard)
  createVoucher(@Body() dto: CreateVoucherDto, @Req() req: { user: JwtPayload }) {
    return this.accountingService.createVoucher(dto, req.user.username);
  }
}
