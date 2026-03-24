import { IsNotEmpty, IsUUID } from 'class-validator';

export class UserManagerAssignmentDTO {
  @IsNotEmpty()
  @IsUUID('4', { message: 'Gestor inválido' })
  managerId: string;

  @IsNotEmpty()
  @IsUUID('4', { message: 'Organização inválida' })
  organizationId: string;
}
