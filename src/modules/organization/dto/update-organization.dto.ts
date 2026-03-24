import { Sanitize } from '@common/decorators';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationDTO {
  @IsOptional()
  @IsString()
  @Sanitize()
  name?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  slug?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
