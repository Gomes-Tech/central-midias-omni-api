import { Sanitize } from '@common/decorators';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
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
  @Type(() => Date)
  @IsDate({ message: 'Data inicial inválida' })
  initialDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Data final inválida' })
  finishDate?: Date;
}
