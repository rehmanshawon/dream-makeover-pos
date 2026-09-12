import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FinancialSummaryService } from './financial-summary.service';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { FinancialSummaryResponseDto } from './dto/financial-summary-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';

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
  constructor(private readonly financialSummaryService: FinancialSummaryService) {}

  @Get('financial-summary')
  async financialSummary(@Query() query: DateRangeQueryDto): Promise<FinancialSummaryResponseDto> {
    return this.financialSummaryService.summarize(query);
  }
}
