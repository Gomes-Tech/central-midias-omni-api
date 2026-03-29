import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateCategoryRoleAccessDTO {
  @IsNotEmpty()
  @IsString()
  categoryId: string;

  @IsNotEmpty()
  @IsUUID('4', { message: 'Perfil inválido' })
  roleId: string;
}
