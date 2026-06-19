import { Sanitize } from '@common/decorators';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
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
  @Type(() => Boolean)
  @Transform(
    ({ value }) => {
      if (value === 'true' || value === true) return true;
      if (value === 'false' || value === false) return false;
      return value;
    },
    { toClassOnly: true },
  )
  @IsBoolean()
  requiresAcceptance?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @Transform(
    ({ value }) => {
      if (value === 'true' || value === true) return true;
      if (value === 'false' || value === false) return false;
      return value;
    },
    { toClassOnly: true },
  )
  @IsBoolean()
  notifyUsers?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @Transform(
    ({ value }) => {
      if (value === 'true' || value === true) return true;
      if (value === 'false' || value === false) return false;
      return value;
    },
    { toClassOnly: true },
  )
  @IsBoolean()
  hasExternalLink?: boolean;

  @IsOptional()
  @IsString()
  externalLink?: string;
}
