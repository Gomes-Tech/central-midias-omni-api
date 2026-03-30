import { Sanitize } from '@common/decorators';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class CreateGlobalRoleDTO {
  @IsNotEmpty()
  @IsString()
  @Sanitize()
  name: string;

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  label: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGlobalRolePermissionDTO)
  permissions: CreateGlobalRolePermissionDTO[];
}

class CreateGlobalRolePermissionDTO {
  @IsNotEmpty()
  @IsString()
  @Sanitize()
  moduleId: string;

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  action: string;
}
