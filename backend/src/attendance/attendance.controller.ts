import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { UpsertAttendanceDto } from './dto/upsert-attendance.dto';
import { AttendanceBulkDto } from './dto/attendance-bulk.dto';
import { AttendanceResponseDto } from './dto/attendance-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import type { JwtPayload } from '../auth/jwt.strategy';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('employee/:employeeId')
  async findForEmployee(
    @Param('employeeId') employeeId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<AttendanceResponseDto[]> {
    return this.attendanceService.findForEmployee(employeeId, from, to);
  }

  @Get('employee/:employeeId/summary')
  async getSummary(
    @Param('employeeId') employeeId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ): Promise<{
    present: number;
    absent: number;
    halfDay: number;
    leave: number;
    notRecorded: number;
    totalDaysInMonth: number;
  }> {
    return this.attendanceService.getMonthlySummary(employeeId, Number(year), Number(month));
  }

  @Put('employee/:employeeId/:date')
  async upsert(
    @Param('employeeId') employeeId: string,
    @Param('date') date: string,
    @Body() dto: UpsertAttendanceDto,
    @Req() req: { user: JwtPayload },
  ): Promise<AttendanceResponseDto> {
    return this.attendanceService.upsert(employeeId, date, dto, req.user.username);
  }

  @Post('employee/:employeeId/bulk')
  async upsertBulk(
    @Param('employeeId') employeeId: string,
    @Body() dto: AttendanceBulkDto,
    @Req() req: { user: JwtPayload },
  ): Promise<AttendanceResponseDto[]> {
    return this.attendanceService.upsertBulk(employeeId, dto, req.user.username);
  }

  @Delete('employee/:employeeId/:date')
  @HttpCode(204)
  async remove(
    @Param('employeeId') employeeId: string,
    @Param('date') date: string,
  ): Promise<void> {
    return this.attendanceService.remove(employeeId, date);
  }
}
