import { Sanitize } from '@common/decorators';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTokenDTO {
  @IsNotEmpty()
  @IsString()
  @Sanitize()
  email: string;

  @IsNotEmpty()
  @IsString()
  @Sanitize()
  token: string;
}
