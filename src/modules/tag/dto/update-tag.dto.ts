import { Sanitize } from '@common/decorators';
import { IsOptional, IsString } from 'class-validator';

export class UpdateTagDTO {
  @IsOptional()
  @IsString()
  @Sanitize()
  name?: string;
}
