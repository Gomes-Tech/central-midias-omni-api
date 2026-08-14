import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { MaterialTemplateDocument } from '../entities';

class DigitalDeliveryDTO {
  @IsIn(['image/png', 'image/jpeg'])
  mimeType: 'image/png' | 'image/jpeg';
}

class PrintDeliveryDTO {
  @IsString()
  presetId: string;
}

class MaterialTemplateDeliveryDTO {
  @IsOptional()
  @ValidateNested()
  @Type(() => DigitalDeliveryDTO)
  digital: DigitalDeliveryDTO | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => PrintDeliveryDTO)
  print: PrintDeliveryDTO | null;
}

export class SaveMaterialTemplateDTO {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  revision: number;

  @IsObject()
  document: MaterialTemplateDocument;

  @IsOptional()
  @ValidateNested()
  @Type(() => MaterialTemplateDeliveryDTO)
  delivery?: MaterialTemplateDeliveryDTO;
}
