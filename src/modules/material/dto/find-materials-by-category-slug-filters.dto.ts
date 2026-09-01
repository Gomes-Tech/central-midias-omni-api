import { Sanitize } from '@common/decorators';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export const MATERIAL_CREATED_AT_SORT_ORDERS = ['desc', 'asc'] as const;

export type MaterialCreatedAtSortOrder =
  (typeof MATERIAL_CREATED_AT_SORT_ORDERS)[number];

export class FindMaterialsByCategorySlugFiltersDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  @Sanitize()
  searchTerm?: string;

  @IsOptional()
  @IsIn(MATERIAL_CREATED_AT_SORT_ORDERS)
  sortOrder?: MaterialCreatedAtSortOrder;
}
