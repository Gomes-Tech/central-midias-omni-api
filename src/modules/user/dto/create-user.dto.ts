import { Sanitize } from '@common/decorators';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { UserManagerAssignmentDTO } from './user-manager-assignment.dto';

export class CreateUserDTO {
  @IsNotEmpty()
  @IsString()
  @Sanitize()
  name: string;

  @IsNotEmpty()
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsNotEmpty()
  @IsString()
  @IsStrongPassword(
    {},
    {
      message:
        'A senha deve ter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas e números',
    },
  )
  password: string;

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  taxIdentifier: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  phone?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  socialReason?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isFirstAccess?: boolean;

  @IsOptional()
  @IsString()
  @Sanitize()
  avatarUrl?: string;

  @IsNotEmpty()
  @IsUUID('4', { message: 'Perfil de plataforma inválido' })
  platformRoleId: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Organização inválida' })
  organizationIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserManagerAssignmentDTO)
  managerAssignments?: UserManagerAssignmentDTO[];
}
