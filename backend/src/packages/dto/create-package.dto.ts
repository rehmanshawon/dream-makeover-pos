import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { PackageItemKind } from '../package-item-kind.enum';

export class CreatePackageItemDto {
  @IsEnum(PackageItemKind)
  itemKind: PackageItemKind;

  @IsUUID()
  itemId: string;
}

export class CreatePackageDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  packagePriceMinor: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePackageItemDto)
  items: CreatePackageItemDto[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
