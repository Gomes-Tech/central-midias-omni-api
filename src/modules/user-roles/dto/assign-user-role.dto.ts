import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AssignUserRoleDTO {
  @IsNotEmpty()
  @IsUUID('4', { message: 'Usuário inválido' })
  userId: string;

  @IsNotEmpty()
  @IsUUID('4', { message: 'Perfil inválido' })
  roleId: string;

  @IsNotEmpty()
  @IsUUID('4', { message: 'Empresa inválida' })
  companyId: string;
}
