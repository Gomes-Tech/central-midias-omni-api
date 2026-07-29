import { Type } from 'class-transformer';
import { IsInt, IsObject, Min } from 'class-validator';
import { MaterialTemplateDocumentV1 } from '../entities';

export class SaveMaterialTemplateDTO {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  revision: number;

  @IsObject()
  document: MaterialTemplateDocumentV1;
}
