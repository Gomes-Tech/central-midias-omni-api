import { Sanitize } from '@common/decorators';
import { UF } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
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
  city?: string;

  @IsOptional()
  @IsEnum(UF, { message: 'UF inválida' })
  @Sanitize()
  uf?: UF;

  @IsOptional()
  @IsString()
  @Sanitize()
  socialReason?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Organização inválida' })
  organizationIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserManagerAssignmentDTO)
  managerAssignments?: UserManagerAssignmentDTO[];

  @IsOptional()
  @IsUUID()
  globalRoleId?: string;
}

/** Campos de credencial só para fluxos internos (ex.: first-access). */
export type UserUpdateInput = UpdateUserDTO & {
  password?: string;
  isFirstAccess?: boolean;
};
