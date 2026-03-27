import { IsOptional, IsString, IsUUID } from 'class-validator';

export class FindAllMembersFiltersDTO {
  @IsOptional()
  @IsUUID('4', { message: 'Perfil inválido' })
  roleId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Usuário inválido' })
  userId?: string;

  @IsOptional()
  @IsString()
  searchTerm?: string;
}
