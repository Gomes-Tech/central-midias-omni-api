import { Sanitize } from '@common/decorators';
import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateCompanyDTO {
  @IsOptional()
  @IsString()
  @Sanitize()
  name?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  slug?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  @Sanitize()
  logoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
