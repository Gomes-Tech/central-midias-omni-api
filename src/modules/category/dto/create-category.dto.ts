import { Sanitize } from '@common/decorators';
import { TransformBoolean } from '@common/decorators/tansform-boolean.decorator';
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
  @IsInt()
  @Min(0)
  order: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @TransformBoolean()
  @IsBoolean()
  hasExternalLink?: boolean;

  @IsOptional()
  @IsString()
  externalLink?: string | null;

  @IsOptional()
  @IsUUID('4', { message: 'Categoria pai inválida' })
  parentId?: string;
}
