import { Sanitize } from '@common/decorators';
import { IsOptional, IsString } from 'class-validator';

export class UpdateRoleDTO {
  @IsOptional()
  @IsString()
  @Sanitize()
  label?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  role?: string;
}
