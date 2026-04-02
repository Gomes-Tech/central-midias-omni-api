import { Sanitize } from '@common/decorators';
import { Type } from 'class-transformer';
import {
  IsArray,
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

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  phone: string;

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  socialReason: string;

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  birthDate: string;

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  admissionDate: string;

  @IsNotEmpty()
  @IsUUID('4', { message: 'Permissão inválida' })
  roleId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserManagerAssignmentDTO)
  managerAssignments?: UserManagerAssignmentDTO[];
}
