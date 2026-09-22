import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class UpdatePayPeriodDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  name: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate: string;
}
