import { IsOptional, IsUUID } from 'class-validator';

export class DeleteCategoryDTO {
  @IsOptional()
  @IsUUID('4', { message: 'Categoria de destino inválida' })
  transferCategoryId?: string;
}
