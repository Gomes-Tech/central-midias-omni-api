import { Sanitize } from '@common/decorators';
import { Transform } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { normalizeMaterialTags } from './material-tags.transform';

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
  @Transform(({ value }) => normalizeMaterialTags(value), {
    toClassOnly: true,
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
