import { IsInt, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class StockInDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  note?: string;
}
