import { Sanitize } from '@common/decorators';
import { UF } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateMemberDTO {
  @IsOptional()
  @IsString()
  @Sanitize()
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  email?: string;

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
  @IsString()
  @Sanitize()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  admissionDate?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  city?: string;

  @IsOptional()
  @IsEnum(UF, { message: 'UF inválida' })
  @Sanitize()
  uf?: UF;

  @IsOptional()
  @IsUUID('4', { message: 'Permissão inválida' })
  roleId: string;
}
