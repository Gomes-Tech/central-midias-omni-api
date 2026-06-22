import { Sanitize } from '@common/decorators';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

function parseMultipartBoolean({
  obj,
  key,
}: {
  obj: Record<string, unknown>;
  key: string;
}) {
  const value = obj[key];

  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;

  return value;
}

export class UpsertFaqDetailDTO {
  @IsOptional()
  @IsString()
  @Sanitize()
  description?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  phonePrimary?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  phonePrimaryLabel?: string;

  @IsOptional()
  @Transform(parseMultipartBoolean, { toClassOnly: true })
  @IsBoolean()
  phonePrimaryIsWhatsapp?: boolean;

  @IsOptional()
  @IsString()
  @Sanitize()
  phoneSecondary?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  phoneSecondaryLabel?: string;

  @IsOptional()
  @Transform(parseMultipartBoolean, { toClassOnly: true })
  @IsBoolean()
  phoneSecondaryIsWhatsapp?: boolean;
}
