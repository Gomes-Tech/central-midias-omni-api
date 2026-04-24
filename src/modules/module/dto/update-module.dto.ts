import { Sanitize } from '@common/decorators';
import { IsOptional, IsString } from 'class-validator';

export class UpdateModuleDTO {
  @IsOptional()
  @IsString()
  @Sanitize()
  name?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  label?: string;
}
