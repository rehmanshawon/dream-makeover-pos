import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FinancialSummaryService } from './financial-summary.service';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { FinancialSummaryResponseDto } from './dto/financial-summary-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { RevenueTrendService } from './revenue-trend.service';
import { TopItemsService } from './top-items.service';
import { ExpenseBreakdownService } from './expense-breakdown.service';
import { RevenueTrendQueryDto } from './dto/revenue-trend-query.dto';
import { TopItemsQueryDto } from './dto/top-items-query.dto';
import { RevenueTrendResponseDto } from './dto/revenue-trend-response.dto';
import { TopItemsResponseDto } from './dto/top-item-response.dto';
import { ExpenseBreakdownResponseDto } from './dto/expense-breakdown-response.dto';

/**
 * Financial reporting endpoints. All routes require ADMIN role.
 *
 * Reports expose the shop's full financial position, including costs
 * and margins. Staff must not access these endpoints.
 */
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ReportsController {
  constructor(
    private readonly financialSummaryService: FinancialSummaryService,
    private readonly revenueTrendService: RevenueTrendService,
    private readonly topItemsService: TopItemsService,
    private readonly expenseBreakdownService: ExpenseBreakdownService,
  ) {}

  @Get('financial-summary')
  async financialSummary(@Query() query: DateRangeQueryDto): Promise<FinancialSummaryResponseDto> {
    return this.financialSummaryService.summarize(query);
  }

  @Get('revenue-trend')
  async revenueTrend(@Query() query: RevenueTrendQueryDto): Promise<RevenueTrendResponseDto> {
    return this.revenueTrendService.daily(query);
  }

  @Get('top-products')
  async topProducts(@Query() query: TopItemsQueryDto): Promise<TopItemsResponseDto> {
    return this.topItemsService.topProducts(query);
  }

  @Get('top-services')
  async topServices(@Query() query: TopItemsQueryDto): Promise<TopItemsResponseDto> {
    return this.topItemsService.topServices(query);
  }

  @Get('expense-breakdown')
  async expenseBreakdown(@Query() query: DateRangeQueryDto): Promise<ExpenseBreakdownResponseDto> {
    return this.expenseBreakdownService.breakdown(query);
  }
}
