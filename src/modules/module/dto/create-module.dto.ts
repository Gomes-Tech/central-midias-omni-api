import { Sanitize } from '@common/decorators';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateModuleDTO {
  @IsNotEmpty()
  @IsString()
  @Sanitize()
  name: string;

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  label: string;
}
