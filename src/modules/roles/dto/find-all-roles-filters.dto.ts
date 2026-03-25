import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class FindAllRolesFiltersDTO {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @IsOptional()
  @IsBoolean()
  canAccessBackoffice?: boolean;

  @IsOptional()
  @IsBoolean()
  canHaveSubordinates?: boolean;
}
