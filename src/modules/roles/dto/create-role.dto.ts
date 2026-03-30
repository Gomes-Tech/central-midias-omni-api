import { Sanitize } from '@common/decorators';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateRoleDTO {
  @IsNotEmpty()
  @IsString()
  @Sanitize()
  name: string;

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  label: string;

  @IsNotEmpty()
  @IsBoolean()
  canHaveSubordinates: boolean;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCategoryRoleAccessDTO)
  categoryRoleAccesses: CreateCategoryRoleAccessDTO[];
}

class CreateCategoryRoleAccessDTO {
  @IsNotEmpty()
  @IsString()
  @Sanitize()
  categoryId: string;
}
