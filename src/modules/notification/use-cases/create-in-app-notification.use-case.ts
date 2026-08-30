import { Inject, Injectable } from '@nestjs/common';
import { NotificationGateway } from '../gateway/notification.gateway';
import { InAppNotificationJobPayload } from '../queue/in-app-notification.job';
import { NotificationRepository } from '../repository';

@Injectable()
export class CreateInAppNotificationUseCase {
  constructor(
    @Inject('NotificationRepository')
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async execute(payload: InAppNotificationJobPayload): Promise<void> {
    const created = await this.notificationRepository.create(payload);

    if (!created) {
      return;
    }

    this.notificationGateway.emitCreated(
      payload.userId,
      payload.organizationId,
      created,
    );
  }
}
