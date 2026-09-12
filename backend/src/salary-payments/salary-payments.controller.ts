import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SalaryPaymentsService } from './salary-payments.service';
import { CreateSalaryPaymentDto } from './dto/create-salary-payment.dto';
import { SalaryPaymentResponseDto } from './dto/salary-payment-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { JwtPayload } from '../auth/jwt.strategy';

/**
 * Salary payment endpoints. All routes require ADMIN role.
 *
 * Salary data is confidential and can only be managed by administrators.
 */
@Controller('salary-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SalaryPaymentsController {
  constructor(private readonly salaryPaymentsService: SalaryPaymentsService) {}

  @Post()
  async create(
    @Body() dto: CreateSalaryPaymentDto,
    @Req() req: { user: JwtPayload },
  ): Promise<SalaryPaymentResponseDto> {
    return this.salaryPaymentsService.create(dto, req.user.username);
  }

  @Get()
  async findAll(): Promise<SalaryPaymentResponseDto[]> {
    return this.salaryPaymentsService.findAll();
  }

  @Get('employee/:employeeId')
  async findByEmployee(
    @Param('employeeId') employeeId: string,
  ): Promise<SalaryPaymentResponseDto[]> {
    return this.salaryPaymentsService.findByEmployee(employeeId);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<SalaryPaymentResponseDto> {
    return this.salaryPaymentsService.findById(id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    return this.salaryPaymentsService.remove(id);
  }
}
