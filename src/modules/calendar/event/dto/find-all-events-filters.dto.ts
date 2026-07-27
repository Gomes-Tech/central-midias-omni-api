import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class FindAllEventsFiltersDTO {
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Data inicial (from) inválida' })
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Data final (to) inválida' })
  to?: Date;

  @IsOptional()
  @IsUUID('4', { message: 'Tipo de evento inválido' })
  eventTypeId?: string;

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
