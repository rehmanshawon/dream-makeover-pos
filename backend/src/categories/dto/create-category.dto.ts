import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { CategoryKind } from '../category-kind.enum';
import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';

export class CreateCategoryDto {
  @IsString()
  @Length(2, 150)
  name: string;

  @IsEnum(CategoryKind)
  kind: CategoryKind;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  active?: boolean;
}
