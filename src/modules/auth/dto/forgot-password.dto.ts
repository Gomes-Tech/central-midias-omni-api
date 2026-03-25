import { IsString } from 'class-validator';

export class ForgotPasswordDTO {
  @IsString()
  taxIdentifier: string;
}
