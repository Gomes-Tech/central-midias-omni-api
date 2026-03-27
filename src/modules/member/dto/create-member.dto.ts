import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateMemberDTO {
  @IsNotEmpty()
  @IsUUID('4', { message: 'Usuário inválido' })
  userId: string;

  @IsNotEmpty()
  @IsUUID('4', { message: 'Perfil inválido' })
  roleId: string;
}
