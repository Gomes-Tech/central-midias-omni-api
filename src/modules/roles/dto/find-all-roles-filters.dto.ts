import { IsBoolean, IsOptional } from 'class-validator';

export class FindAllRolesFiltersDTO {
  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean;
}
