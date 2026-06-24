import { Sanitize } from '@common/decorators';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import {
  MaterialCustomizationDTO,
  TransformBoolean,
  TransformMaterialCustomization,
} from './material-customization.dto';

export class UpdateMaterialDTO {
  @IsOptional()
  @IsString()
  @Sanitize()
  name?: string;

  @IsOptional()
  @IsString()
  @Sanitize(true)
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @TransformBoolean()
  @IsBoolean()
  requiresAcceptance?: boolean;

  @IsOptional()
  @TransformBoolean()
  @IsBoolean()
  hasExternalLink?: boolean;

  @IsOptional()
  @IsString()
  externalLink?: string;

  @IsOptional()
  @TransformBoolean()
  @IsBoolean()
  isCustomizable?: boolean;

  @IsOptional()
  @TransformMaterialCustomization()
  customization?: MaterialCustomizationDTO;
}
