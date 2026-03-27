import { Sanitize } from '@common/decorators';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class UpdateCategoryDTO {
  @IsOptional()
  @IsString()
  @Sanitize()
  name?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  slug?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUUID('4', { message: 'Categoria pai inválida' })
  parentId?: string | null;
}
