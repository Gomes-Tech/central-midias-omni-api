import { Sanitize } from '@common/decorators';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateCategoryDTO {
  @IsNotEmpty()
  @IsString()
  @Sanitize()
  name: string;

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  slug: string;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  order: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUUID('4', { message: 'Categoria pai inválida' })
  parentId?: string;
}
