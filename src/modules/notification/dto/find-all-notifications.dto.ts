import { TransformBoolean } from '@common/decorators/tansform-boolean.decorator';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class FindAllNotificationsFiltersDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @TransformBoolean()
  @IsBoolean()
  onlyUnread?: boolean;
}
