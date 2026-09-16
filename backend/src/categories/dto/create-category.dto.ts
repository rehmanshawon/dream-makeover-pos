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
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
