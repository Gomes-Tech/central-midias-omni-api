import { Sanitize } from '@common/decorators';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}
