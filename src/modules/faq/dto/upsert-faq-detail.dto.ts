import { Sanitize } from '@common/decorators';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

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
  @Transform(
    ({ value }) => {
      if (value === 'true' || value === true) return true;
      if (value === 'false' || value === false) return false;
      return value;
    },
    { toClassOnly: true },
  )
  @Type(() => Boolean)
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
  @Transform(
    ({ value }) => {
      if (value === 'true' || value === true) return true;
      if (value === 'false' || value === false) return false;
      return value;
    },
    { toClassOnly: true },
  )
  @Type(() => Boolean)
  @IsBoolean()
  phoneSecondaryIsWhatsapp?: boolean;
}
