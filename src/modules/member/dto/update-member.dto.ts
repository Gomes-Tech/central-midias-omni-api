import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateMemberDTO {
  @IsNotEmpty()
  @IsUUID('4', { message: 'Perfil inválido' })
  roleId: string;
}
