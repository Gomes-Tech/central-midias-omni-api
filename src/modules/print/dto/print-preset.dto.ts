import { PrintRenderingIntent } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SavePrintPresetDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsNotEmpty()
  colorProfileId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(10)
  @Max(5000)
  trimWidthMm: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(10)
  @Max(5000)
  trimHeightMm: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(30)
  bleedTopMm: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(30)
  bleedRightMm: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(30)
  bleedBottomMm: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(30)
  bleedLeftMm: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(100)
  safeMarginTopMm: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(100)
  safeMarginRightMm: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(100)
  safeMarginBottomMm: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(100)
  safeMarginLeftMm: number;

  @Type(() => Number)
  @IsInt()
  @Min(72)
  @Max(600)
  minimumDpi: number;

  @IsBoolean()
  includeCropMarks: boolean;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(30)
  cropMarkOffsetMm: number;

  @IsEnum(PrintRenderingIntent)
  renderingIntent: PrintRenderingIntent;
}
