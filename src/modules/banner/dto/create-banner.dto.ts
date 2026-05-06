import { Sanitize } from '@common/decorators';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateBannerDTO {
  @IsNotEmpty()
  @IsString()
  @Sanitize()
  name: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Link inválido' })
  @Sanitize()
  link?: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(
    ({ value }) => {
      if (!value) return undefined;
      return new Date(value);
    },
    {
      toClassOnly: true,
    },
  )
  initialDate?: Date;

  @IsOptional()
  @Transform(
    ({ value }) => {
      if (!value) return undefined;
      return new Date(value);
    },
    {
      toClassOnly: true,
    },
  )
  finishDate?: Date;
}
