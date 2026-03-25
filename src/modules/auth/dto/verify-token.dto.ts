import { IsEmail, IsString } from 'class-validator';

export class VerifyTokenDTO {
  @IsString()
  token: string;

  @IsEmail({}, { message: 'Email inválido' })
  email: string;
}
