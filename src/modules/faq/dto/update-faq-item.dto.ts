import { Sanitize } from '@common/decorators';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateFaqItemDTO {
  @IsOptional()
  @IsString()
  @Sanitize()
  question?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  answer?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}
