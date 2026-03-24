import { Sanitize } from '@common/decorators';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class CreateRoleDTO {
  @IsNotEmpty()
  @IsString()
  @Sanitize()
  name: string;

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  label: string;

  @IsNotEmpty()
  @IsBoolean()
  isBackoffice: boolean;

  @IsNotEmpty()
  @IsBoolean()
  canHaveSubordinates: boolean;
}
