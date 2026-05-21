import { Sanitize } from '@common/decorators';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class FindAllRolePermissionsFiltersDTO {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  @Sanitize()
  searchTerm?: string;
}
