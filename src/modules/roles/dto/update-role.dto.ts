import { Sanitize } from '@common/decorators';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

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
  canAccessBackoffice?: boolean;

  @IsOptional()
  @IsBoolean()
  canHaveSubordinates?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryRoleAccesses?: string[];
}
