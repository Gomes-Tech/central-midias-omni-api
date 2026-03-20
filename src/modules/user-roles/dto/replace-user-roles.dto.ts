import { ArrayUnique, IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class ReplaceUserRolesDTO {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true, message: 'Perfil inválido' })
  roles: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true, message: 'Empresa inválida' })
  companyIds?: string[];
}
