import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { CustomizationPosition } from '@prisma/client';

function transformBoolean(value: unknown): unknown {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}

function parseCustomization(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    return plainToInstance(MaterialCustomizationDTO, value);
  }

  try {
    return plainToInstance(MaterialCustomizationDTO, JSON.parse(value));
  } catch {
    return value;
  }
}

export class MaterialCustomizationDTO {
  @IsOptional()
  @IsEnum(CustomizationPosition)
  position?: CustomizationPosition;

  @IsOptional()
  @Transform(({ value }) => transformBoolean(value), { toClassOnly: true })
  @IsBoolean()
  hasPhonePrimary?: boolean;

  @IsOptional()
  @Transform(({ value }) => transformBoolean(value), { toClassOnly: true })
  @IsBoolean()
  hasPhoneSecondary?: boolean;

  @IsOptional()
  @Transform(({ value }) => transformBoolean(value), { toClassOnly: true })
  @IsBoolean()
  hasAddress?: boolean;

  @IsOptional()
  @Transform(({ value }) => transformBoolean(value), { toClassOnly: true })
  @IsBoolean()
  hasCity?: boolean;
}

export function TransformMaterialCustomization() {
  return function (target: object, propertyKey: string | symbol) {
    Transform(({ value }) => parseCustomization(value), {
      toClassOnly: true,
    })(target, propertyKey);
    IsObject()(target, propertyKey);
    ValidateNested()(target, propertyKey);
  };
}

export function TransformBoolean() {
  return Transform(({ value }) => transformBoolean(value), {
    toClassOnly: true,
  });
}
