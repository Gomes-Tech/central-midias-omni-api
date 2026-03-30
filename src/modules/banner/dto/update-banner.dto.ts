import { Sanitize } from '@common/decorators';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class UpdateBannerDTO {
  @IsOptional()
  @IsString()
  @Sanitize()
  name?: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Link inválido' })
  @Sanitize()
  link?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Data inicial inválida' })
  initialDate?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Data final inválida' })
  finishDate?: Date | null;
}
