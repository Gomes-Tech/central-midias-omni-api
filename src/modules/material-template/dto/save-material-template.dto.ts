import { Type } from 'class-transformer';
import { IsInt, IsObject, Min } from 'class-validator';
import { MaterialTemplateDocument } from '../entities';

export class SaveMaterialTemplateDTO {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  revision: number;

  @IsObject()
  document: MaterialTemplateDocument;
}
