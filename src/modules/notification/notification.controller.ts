import { OrgId, UserId } from '@common/decorators';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PaginatedResponse } from '../../types';
import { FindAllNotificationsFiltersDTO } from './dto';
import { NotificationItem } from './entities';
import {
  CountUnreadNotificationsUseCase,
  FindMyNotificationsUseCase,
  MarkAllNotificationsAsReadUseCase,
  MarkNotificationAsReadUseCase,
} from './use-cases';

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly findMyNotificationsUseCase: FindMyNotificationsUseCase,
    private readonly countUnreadNotificationsUseCase: CountUnreadNotificationsUseCase,
    private readonly markNotificationAsReadUseCase: MarkNotificationAsReadUseCase,
    private readonly markAllNotificationsAsReadUseCase: MarkAllNotificationsAsReadUseCase,
  ) {}

  @Get()
  async list(
    @UserId() userId: string,
    @OrgId() organizationId: string,
    @Query() filters: FindAllNotificationsFiltersDTO = {},
  ): Promise<PaginatedResponse<NotificationItem>> {
    return await this.findMyNotificationsUseCase.execute(
      userId,
      organizationId,
      filters,
    );
  }

  @Get('unread-count')
  async unreadCount(
    @UserId() userId: string,
    @OrgId() organizationId: string,
  ): Promise<{ count: number }> {
    return await this.countUnreadNotificationsUseCase.execute(
      userId,
      organizationId,
    );
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @UserId() userId: string,
    @OrgId() organizationId: string,
  ): Promise<void> {
    await this.markNotificationAsReadUseCase.execute(
      id,
      userId,
      organizationId,
    );
  }

  @Post('read-all')
  async markAllAsRead(
    @UserId() userId: string,
    @OrgId() organizationId: string,
  ): Promise<{ updated: number }> {
    return await this.markAllNotificationsAsReadUseCase.execute(
      userId,
      organizationId,
    );
  }
}
