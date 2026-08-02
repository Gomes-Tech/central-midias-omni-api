import { Sanitize } from '@common/decorators';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class SearchMaterialsFiltersDTO {
  @IsOptional()
  @IsString()
  @Sanitize()
  term?: string;

  @IsOptional()
  @IsUUID()
  searchId?: string;

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
}
