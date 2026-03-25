import { Sanitize } from '@common/decorators';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrganizationDTO {
  @IsNotEmpty()
  @IsString()
  @Sanitize()
  name: string;

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  slug: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @Sanitize()
  domain?: string;

  @IsOptional()
  @IsBoolean()
  shouldAttachUsersByDomain?: boolean;
}
