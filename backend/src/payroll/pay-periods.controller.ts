import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PayPeriodsService } from './pay-periods.service';
import { CreatePayPeriodDto } from './dto/create-pay-period.dto';
//import { UpdatePayPeriodDto } from './dto/update-pay-period.dto';
import { PayPeriodResponseDto } from './dto/pay-period-response.dto';
import { PayableEmployeeDto } from './dto/payable-employee.dto';
import { RunPayrollResponseDto } from './dto/run-payroll-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import type { JwtPayload } from '../auth/jwt.strategy';
import { DeletePaymentsDto } from './dto/delete-payments.dto';
import { SalaryPaymentResponseDto } from '../salary-payments/dto/salary-payment-response.dto';

@Controller('pay-periods')
@UseGuards(JwtAuthGuard)
export class PayPeriodsController {
  constructor(private readonly service: PayPeriodsService) {}

  @Get()
  async findAll(): Promise<PayPeriodResponseDto[]> {
    return this.service.findAll();
  }

  @Get('next-reminder')
  async getNextReminder(): Promise<{
    shouldRemind: boolean;
    nextMonth: { year: number; month: number; name: string };
    hasNextPeriod: boolean;
  }> {
    return this.service.getNextReminder();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<PayPeriodResponseDto> {
    return this.service.findById(id);
  }

  @Get(':id/payables')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getPayables(@Param('id') id: string): Promise<PayableEmployeeDto[]> {
    return this.service.getPayables(id);
  }

  @Get(':id/payments')
  async getPayments(@Param('id') id: string): Promise<SalaryPaymentResponseDto[]> {
    return this.service.getPaymentsForPeriod(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreatePayPeriodDto): Promise<PayPeriodResponseDto> {
    return this.service.create(dto);
  }

  @Post('payments/delete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async deletePayments(@Body() dto: DeletePaymentsDto): Promise<{ deletedCount: number }> {
    return this.service.deletePayments(dto.ids);
  }

  @Post(':id/close')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async close(
    @Param('id') id: string,
    @Req() req: { user: JwtPayload },
  ): Promise<PayPeriodResponseDto> {
    return this.service.close(id, req.user.username);
  }

  @Post(':id/run')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async run(
    @Param('id') id: string,
    @Req() req: { user: JwtPayload },
  ): Promise<RunPayrollResponseDto> {
    return this.service.runPayroll(id, req.user.username);
  }
}
