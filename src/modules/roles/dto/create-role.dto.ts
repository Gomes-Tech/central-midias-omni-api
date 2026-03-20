import { Sanitize } from '@common/decorators';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRoleDTO {
  @IsNotEmpty()
  @IsString()
  @Sanitize()
  label: string;

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  role: string;
}
