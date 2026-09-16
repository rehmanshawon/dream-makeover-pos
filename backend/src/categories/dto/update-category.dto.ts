import { IsBoolean, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

/**
 * Partial update for a category.
 *
 * `kind` and `parentId` are intentionally excluded. Changing the kind
 * of a category that is already referenced by products or services
 * would break referential integrity. Moving a category to a new parent
 * is deferred until a dedicated re-parenting feature is needed.
 */
export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @Length(2, 150)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
