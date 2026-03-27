import { Sanitize } from '@common/decorators';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMemberWithUserDTO {
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

  @IsOptional()
  @IsUUID('4', { message: 'Perfil de plataforma inválido' })
  platformRoleId?: string;

  @IsNotEmpty()
  @IsUUID('4', { message: 'Perfil do membro inválido' })
  roleId: string;
}
