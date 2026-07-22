import { Sanitize } from '@common/decorators';
import { TransformBoolean } from '@common/decorators/tansform-boolean.decorator';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  MaterialCustomizationDTO,
  TransformMaterialCustomization,
} from './material-customization.dto';
import {
  normalizeMaterialTags,
  readMaterialTagsField,
} from './material-tags.transform';

export class CreateMaterialDTO {
  @IsNotEmpty()
  @IsString()
  @Sanitize()
  name: string;

  @IsOptional()
  @IsString()
  @Sanitize(true)
  description?: string;

  @IsNotEmpty()
  @IsString()
  categoryId: string;

  @IsOptional()
  @Transform(({ obj }) => normalizeMaterialTags(readMaterialTagsField(obj)), {
    toClassOnly: true,
  })
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
  notifyUsers?: boolean;

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
  hasTextCopy?: boolean;

  @IsOptional()
  @IsString()
  textCopy?: string;

  @IsOptional()
  @TransformBoolean()
  @IsBoolean()
  isCustomizable?: boolean;

  @IsOptional()
  @TransformMaterialCustomization()
  customization?: MaterialCustomizationDTO;

  @IsOptional()
  @IsString()
  roleId?: string;
}
