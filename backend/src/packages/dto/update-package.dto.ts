import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreatePackageItemDto } from './create-package.dto';

/**
 * Partial update for a package.
 *
 * When `items` is provided, the package's composition is fully replaced
 * with the new list. When omitted, the composition is preserved.
 */
export class UpdatePackageDto {
  @IsOptional()
  @IsString()
  @Length(2, 150)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  packagePriceMinor?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePackageItemDto)
  items?: CreatePackageItemDto[];
}
