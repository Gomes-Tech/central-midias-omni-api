import { Sanitize } from '@common/decorators';
import { TransformBoolean } from '@common/decorators/tansform-boolean.decorator';
import { Transform } from 'class-transformer';
import {
  Allow,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import {
  MATERIAL_EXPORT_TYPES,
  normalizeMaterialExportTypes,
  normalizePrintPresetId,
  readMaterialExportTypesField,
} from './material-export-types';
import {
  normalizeMaterialTags,
  readMaterialTagsField,
} from './material-tags.transform';
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

  @Allow()
  @IsOptional()
  @Transform(
    ({ obj }) =>
      normalizeMaterialExportTypes(readMaterialExportTypesField(obj)),
    { toClassOnly: true },
  )
  @IsArray()
  @IsIn(['png', 'jpg', 'pdf', 'print_pdf'], { each: true })
  exportTypes?: Array<(typeof MATERIAL_EXPORT_TYPES)[number]>;

  @Allow()
  @IsOptional()
  @Transform(({ obj }) => normalizePrintPresetId(obj.printPresetId), {
    toClassOnly: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  printPresetId?: string | null;

  @IsOptional()
  @IsString()
  roleId?: string;
}
