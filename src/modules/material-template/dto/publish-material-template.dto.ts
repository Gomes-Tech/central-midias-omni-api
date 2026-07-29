import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class PublishMaterialTemplateDTO {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  revision: number;
}
