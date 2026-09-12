import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeResponseDto } from './dto/employee-response.dto';
import { EmployeeStatus } from './employee-status.enum';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';

/**
 * Employee management endpoints. All routes require ADMIN role.
 *
 * Employee data includes salary and personal information, so access is
 * restricted to administrators only.
 */
@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  async create(@Body() dto: CreateEmployeeDto): Promise<EmployeeResponseDto> {
    return this.employeesService.create(dto);
  }

  @Get()
  async findAll(@Query('status') status?: EmployeeStatus): Promise<EmployeeResponseDto[]> {
    return this.employeesService.findAll(status);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<EmployeeResponseDto> {
    return this.employeesService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<EmployeeResponseDto> {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  async deactivate(@Param('id') id: string): Promise<EmployeeResponseDto> {
    return this.employeesService.deactivate(id);
  }
}
