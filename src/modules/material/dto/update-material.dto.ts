import { Sanitize } from '@common/decorators';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { normalizeMaterialTags } from './material-tags.transform';

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
  @Transform(({ value }) => normalizeMaterialTags(value), {
    toClassOnly: true,
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
