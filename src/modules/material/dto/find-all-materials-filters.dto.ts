import { Sanitize } from '@common/decorators';
import { IsOptional, IsString } from 'class-validator';

export class FindAllMaterialsFiltersDTO {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  searchTerm?: string;
}
