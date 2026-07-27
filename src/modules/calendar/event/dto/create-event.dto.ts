import { Sanitize } from '@common/decorators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateEventDTO {
  @ApiProperty({ example: 'Campanha Dia das Mães' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  @Sanitize()
  title: string;

  @ApiProperty({
    example: 'Materiais disponíveis. Veja https://exemplo.com/briefing',
  })
  @IsString()
  @Sanitize()
  description: string;

  @ApiProperty({ example: '2026-05-01T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate({ message: 'Data de início inválida' })
  startDate: Date;

  @ApiProperty({ example: '2026-05-10T23:59:59.000Z' })
  @Type(() => Date)
  @IsDate({ message: 'Data de término inválida' })
  endDate: Date;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'Tipo de evento inválido' })
  eventTypeId: string;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Materiais vinculados ao evento. Vazio = evento geral.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true, message: 'Material inválido' })
  materialIds?: string[];

  @ApiPropertyOptional({
    example: 'https://exemplo.com',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'URL externa inválida' },
  )
  @Sanitize()
  externalUrl?: string | null;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
