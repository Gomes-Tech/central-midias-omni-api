import { Sanitize } from '@common/decorators';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDate,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateEventDTO {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Sanitize()
  title?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  description?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Data de início inválida' })
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Data de término inválida' })
  endDate?: Date;

  @IsOptional()
  @IsUUID('4', { message: 'Tipo de evento inválido' })
  eventTypeId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true, message: 'Material inválido' })
  materialIds?: string[];

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'URL externa inválida' },
  )
  @Sanitize()
  externalUrl?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
