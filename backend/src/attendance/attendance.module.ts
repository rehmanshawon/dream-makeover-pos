import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from './attendance.entity';
import { Employee } from '../employees/employee.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { AuthCommonModule } from '../auth/auth-common.module';

@Module({
  imports: [TypeOrmModule.forFeature([Attendance, Employee]), AuthCommonModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
