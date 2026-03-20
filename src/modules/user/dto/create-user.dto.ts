import { Sanitize } from '@common/decorators';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  IsUUID,
} from 'class-validator';
import { roles, UserRole } from 'types/role';

export class CreateUserDTO {
  @IsNotEmpty()
  @IsString()
  @Sanitize()
  name: string;

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  socialReason: string;

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  taxIdentifier: string;

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  phone: string;

  @IsNotEmpty()
  @IsDateString()
  birthDate: string;

  @IsNotEmpty()
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsOptional()
  @IsString()
  @IsStrongPassword(
    {},
    {
      message:
        'A senha deve ter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas e números',
    },
  )
  password?: string;

  @IsOptional()
  @IsBoolean()
  isEmployee?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(roles, { each: true, message: 'Função inválida' })
  roles: UserRole[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Empresa inválida' })
  companyIds?: string[];

  @IsOptional()
  @IsBoolean()
  isManager?: boolean;
}
