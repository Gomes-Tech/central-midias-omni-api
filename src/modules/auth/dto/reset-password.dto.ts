import { IsStrongPassword } from '@common/decorators';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ResetPasswordDTO {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @IsString()
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsNotEmpty()
  @IsString()
  @IsStrongPassword({
    message:
      'A senha deve ter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas e números',
  })
  password: string;
}
