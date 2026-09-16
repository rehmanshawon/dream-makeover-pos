import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsQueryDto } from './dto/transactions-query.dto';
import { TransactionListResponseDto } from './dto/transaction-list-response.dto';
import { TransactionDetailDto } from './dto/transaction-detail.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  async list(@Query() query: TransactionsQueryDto): Promise<TransactionListResponseDto> {
    return this.transactionsService.list(query);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<TransactionDetailDto> {
    return this.transactionsService.findById(id);
  }
}
