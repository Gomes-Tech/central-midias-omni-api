import { Sanitize } from '@common/decorators';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTagDTO {
  @IsNotEmpty()
  @IsString()
  @Sanitize()
  name: string;
}
