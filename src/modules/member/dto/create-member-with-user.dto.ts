import { CreateUserDTO } from '@modules/user';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateMemberWithUserDTO extends CreateUserDTO {
  @IsNotEmpty()
  @IsUUID('4', { message: 'Perfil do membro inválido' })
  roleId: string;
}
