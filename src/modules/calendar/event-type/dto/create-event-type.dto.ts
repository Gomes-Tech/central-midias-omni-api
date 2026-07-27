import { Sanitize } from '@common/decorators';
import { normalizeHexColor } from '@common/utils/normalize-hex-color';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export class CreateEventTypeDTO {
  @ApiProperty({ example: 'Feriado', maxLength: 100 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  @Sanitize()
  name: string;

  @ApiPropertyOptional({ example: 'feriado' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Sanitize()
  slug?: string;

  @ApiProperty({ example: '#DC2626' })
  @IsNotEmpty()
  @IsString()
  @Matches(HEX_COLOR_PATTERN, {
    message: 'Cor inválida. Use o formato hexadecimal #RRGGBB',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeHexColor(value) : value,
  )
  color: string;

  @ApiPropertyOptional({ example: 'Feriados nacionais e regionais' })
  @IsOptional()
  @IsString()
  @Sanitize()
  description?: string | null;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
