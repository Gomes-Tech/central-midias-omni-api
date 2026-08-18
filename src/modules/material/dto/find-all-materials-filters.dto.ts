import { Sanitize } from '@common/decorators';
import { TransformBoolean } from '@common/decorators/tansform-boolean.decorator';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class FindAllMaterialsFiltersDTO {
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
  categoryId?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  searchTerm?: string;

  @IsOptional()
  @TransformBoolean()
  @IsBoolean()
  requiresAcceptance?: boolean;
}
