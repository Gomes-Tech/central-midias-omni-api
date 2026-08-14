import type { MaterialTemplateDocumentV2 } from '@modules/material-template/entities';
import { IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';

export class CreatePrintExportDTO {
  @IsObject()
  document: MaterialTemplateDocumentV2;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  idempotencyKey: string;
}
