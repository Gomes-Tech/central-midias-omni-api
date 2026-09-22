import type {
  MaterialTemplateDocumentV2,
  MaterialTemplateDocumentV3,
} from '@modules/material-template/entities';
import { BadRequestException } from '@common/filters';
import { MAX_IMAGE_PLACEHOLDERS } from '@common/constants/print-image-limits';
import { Transform, plainToInstance } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

function parseJson(value: unknown, field: string): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new BadRequestException(`${field}: JSON inválido`);
  }
}

export class PrintImageBindingDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  layerId: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{1,100}$/)
  fileField: string;

  @IsOptional()
  @IsIn(['cover', 'contain'])
  fit?: 'cover' | 'contain';

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(1)
  positionX?: number;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(1)
  positionY?: number;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(1)
  @Max(3)
  zoom?: number;
}

export class CreatePrintExportDTO {
  @Transform(({ value }) => parseJson(value, 'document'))
  @IsObject()
  document: MaterialTemplateDocumentV2 | MaterialTemplateDocumentV3;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  idempotencyKey: string;

  @IsOptional()
  @Transform(({ value }) => {
    const parsed = parseJson(value, 'imageBindings');
    return Array.isArray(parsed)
      ? plainToInstance(PrintImageBindingDTO, parsed)
      : parsed;
  })
  @IsArray()
  @ArrayMaxSize(MAX_IMAGE_PLACEHOLDERS)
  @ValidateNested({ each: true })
  imageBindings?: PrintImageBindingDTO[];
}
