import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateCostRevaluationDto {
  @IsUUID()
  productId: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  effectiveDate: string;

  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  newUnitCostMinor: number;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  note?: string;
}
