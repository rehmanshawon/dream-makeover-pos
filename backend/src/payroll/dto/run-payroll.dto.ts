import { ArrayMinSize, IsArray, IsOptional, IsUUID } from 'class-validator';

export class RunPayrollDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  employeeIds?: string[];
}
