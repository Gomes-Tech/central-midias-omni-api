import { Sanitize } from '@common/decorators';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
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
