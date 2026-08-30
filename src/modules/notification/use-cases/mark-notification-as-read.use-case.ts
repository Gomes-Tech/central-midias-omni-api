import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { NotificationRepository } from '../repository';

@Injectable()
export class MarkNotificationAsReadUseCase {
  constructor(
    @Inject('NotificationRepository')
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(id: string, userId: string, organizationId: string) {
    const notification = await this.notificationRepository.findOwnedById(
      id,
      userId,
      organizationId,
    );

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }

    if (notification.readAt) {
      return;
    }

    await this.notificationRepository.markAsRead(id, userId, organizationId);
  }
}
