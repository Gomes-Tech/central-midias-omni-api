import { IsBoolean, IsNotEmpty } from 'class-validator';

export class AcceptMaterialDTO {
  @IsNotEmpty()
  @IsBoolean()
  accepted: boolean;
}
