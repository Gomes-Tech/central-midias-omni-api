import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePrintColorProfileDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  outputConditionIdentifier: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class ArchivePrintColorProfileDTO {
  @IsBoolean()
  isActive: boolean;
}

export class UpdatePrintColorProfileDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  outputConditionIdentifier: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
