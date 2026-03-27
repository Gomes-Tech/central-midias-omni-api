import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class FindAllCategoriesFiltersDTO {
  @IsOptional()
  @IsUUID('4', { message: 'Categoria pai inválida' })
  parentId?: string;

  @IsOptional()
  @Transform(
    ({ value }) => {
      if (value === 'true' || value === true) return true;
      if (value === 'false' || value === false) return false;
      return value;
    },
    { toClassOnly: true },
  )
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  searchTerm?: string;
}
