import { Sanitize } from '@common/decorators';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class UpdateGlobalRoleDTO {
  @IsOptional()
  @IsString()
  @Sanitize()
  name?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  label?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateGlobalRolePermissionDTO)
  permissions?: UpdateGlobalRolePermissionDTO[];
}

class UpdateGlobalRolePermissionDTO {
  @IsNotEmpty()
  @IsString()
  @Sanitize()
  moduleId: string;

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  action: string;
}
