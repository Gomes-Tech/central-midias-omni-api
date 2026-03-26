import { IsEmail, IsString } from 'class-validator';

export class ForgotPasswordDTO {
  @IsString()
  @IsEmail({}, { message: 'Email inválido' })
  email: string;
}
