import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class FindAllEventTypesFiltersDTO {
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
