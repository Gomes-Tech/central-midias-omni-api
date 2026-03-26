import { Sanitize } from '@common/decorators';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrganizationDTO {
  @IsNotEmpty()
  @IsString()
  @Sanitize()
  name: string;

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  slug: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @Sanitize()
  domain?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(
    ({ value }) => {
      const val =
        typeof value === 'string' ? value.replace(/^"|"$/g, '') : value;
      if (val === 'true') return true;
      if (val === 'false') return false;
      return false;
    },
    {
      toClassOnly: true,
    },
  )
  shouldAttachUsersByDomain?: boolean;
}
