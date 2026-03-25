import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateTokenDTO {
  @IsNotEmpty()
  @IsBoolean()
  used: boolean;
}
