import { Inject, Injectable } from '@nestjs/common';
import { NotificationRepository } from '../repository';

@Injectable()
export class MarkAllNotificationsAsReadUseCase {
  constructor(
    @Inject('NotificationRepository')
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(userId: string, organizationId: string) {
    const updated = await this.notificationRepository.markAllAsRead(
      userId,
      organizationId,
    );

    return { updated };
  }
}
