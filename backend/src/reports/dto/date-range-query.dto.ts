import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

export enum DateRangePreset {
  THIS_WEEK = 'this_week',
  THIS_MONTH = 'this_month',
  PREVIOUS_MONTH = 'previous_month',
  CUSTOM = 'custom',
}

export class DateRangeQueryDto {
  @IsEnum(DateRangePreset)
  @IsOptional()
  range?: DateRangePreset;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'from must be in YYYY-MM-DD format',
  })
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'to must be in YYYY-MM-DD format',
  })
  to?: string;
}

/**
 * Resolved interval. `from` and `to` are inclusive calendar days.
 */
export interface DateRange {
  from: string;
  to: string;
}
