import { Sanitize } from '@common/decorators';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDTO {
  @IsNotEmpty()
  @IsString()
  @Sanitize()
  login: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
