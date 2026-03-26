import { Sanitize } from '@common/decorators';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDTO {
  @IsNotEmpty()
  @IsString()
  @IsEmail({}, { message: 'Email inválido' })
  @Sanitize()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
