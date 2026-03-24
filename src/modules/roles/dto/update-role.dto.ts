import { Sanitize } from '@common/decorators';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateRoleDTO {
  @IsOptional()
  @IsString()
  @Sanitize()
  label?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isBackoffice?: boolean;

  @IsOptional()
  @IsBoolean()
  canHaveSubordinates?: boolean;
}
