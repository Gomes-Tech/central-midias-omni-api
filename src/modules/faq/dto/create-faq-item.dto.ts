import { Sanitize } from '@common/decorators';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateFaqItemDTO {
  @IsNotEmpty()
  @IsString()
  @Sanitize()
  question: string;

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  answer: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order: number;
}
