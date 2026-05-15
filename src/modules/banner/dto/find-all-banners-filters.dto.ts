import { Sanitize } from '@common/decorators';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class FindAllBannersFiltersDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

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
  onlyActive?: boolean;

  @IsOptional()
  @IsString()
  @Sanitize()
  searchTerm?: string;

  @IsOptional()
  @Transform(
    ({ value }) => {
      if (!value) return undefined;
      return new Date(value);
    },
    { toClassOnly: true },
  )
  initialDate?: Date;

  @IsOptional()
  @Transform(
    ({ value }) => {
      if (!value) return undefined;
      return new Date(value);
    },
    { toClassOnly: true },
  )
  finishDate?: Date;
}
