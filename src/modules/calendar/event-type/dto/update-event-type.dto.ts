import { Sanitize } from '@common/decorators';
import { normalizeHexColor } from '@common/utils/normalize-hex-color';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export class UpdateEventTypeDTO {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Sanitize()
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Sanitize()
  slug?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_PATTERN, {
    message: 'Cor inválida. Use o formato hexadecimal #RRGGBB',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeHexColor(value) : value,
  )
  color?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
