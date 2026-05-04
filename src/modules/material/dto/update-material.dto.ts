import { Sanitize } from '@common/decorators';
import { IsOptional, IsString } from 'class-validator';

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
}
