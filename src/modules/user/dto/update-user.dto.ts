import { Sanitize } from '@common/decorators';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsStrongPassword,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { UserManagerAssignmentDTO } from './user-manager-assignment.dto';

export class UpdateUserDTO {
  @IsOptional()
  @IsString()
  @Sanitize()
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  email?: string;

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
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @Sanitize()
  taxIdentifier?: string;

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
  isFirstAccess?: boolean;

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
