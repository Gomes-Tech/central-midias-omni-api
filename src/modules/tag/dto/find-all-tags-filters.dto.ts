import { Sanitize } from '@common/decorators';
import { IsOptional, IsString } from 'class-validator';

export class FindAllTagsFiltersDTO {
  @IsOptional()
  @IsString()
  @Sanitize()
  searchTerm?: string;
}
