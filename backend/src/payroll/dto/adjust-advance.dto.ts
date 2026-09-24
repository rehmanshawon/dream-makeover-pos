import { IsInt, Min } from 'class-validator';

export class AdjustAdvanceDto {
  @IsInt()
  @Min(1)
  amountMinor: number;
}
