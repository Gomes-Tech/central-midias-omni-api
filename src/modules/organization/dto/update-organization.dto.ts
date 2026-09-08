import { Sanitize } from '@common/decorators';
import { normalizeHexColor } from '@common/utils/normalize-hex-color';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function transformOptionalHexColor({ value }: { value: unknown }) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  return typeof value === 'string' ? normalizeHexColor(value) : value;
}

export class UpdateOrganizationDTO {
  @IsOptional()
  @IsString()
  @Sanitize()
  name?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  slug?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @IsOptional()
  @Transform(transformOptionalHexColor)
  @ValidateIf((_, value) => value != null)
  @IsString()
  @Matches(HEX_COLOR_PATTERN, {
    message: 'Cor inválida. Use o formato hexadecimal #RRGGBB',
  })
  primaryColor?: string | null;

  @IsOptional()
  @Transform(transformOptionalHexColor)
  @ValidateIf((_, value) => value != null)
  @IsString()
  @Matches(HEX_COLOR_PATTERN, {
    message: 'Cor inválida. Use o formato hexadecimal #RRGGBB',
  })
  secondaryColor?: string | null;
}
