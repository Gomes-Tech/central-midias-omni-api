import { Sanitize } from '@common/decorators';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateGlobalUserDTO {
  @IsNotEmpty()
  @IsString()
  @Sanitize()
  name: string;

  @IsNotEmpty()
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  taxIdentifier: string;

  @IsNotEmpty()
  @IsString()
  globalRoleId: string;

  @IsNotEmpty()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Organização inválida' })
  organizationIds: string[];
}
