import { Inject, Injectable } from '@nestjs/common';
import { NotificationRepository } from '../repository';

@Injectable()
export class CountUnreadNotificationsUseCase {
  constructor(
    @Inject('NotificationRepository')
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(userId: string, organizationId: string) {
    const count = await this.notificationRepository.countUnread(
      userId,
      organizationId,
    );

    return { count };
  }
}
