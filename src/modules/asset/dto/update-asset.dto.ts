import { Sanitize } from '@common/decorators';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateAssetDTO {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  @Sanitize()
  name?: string;
}
