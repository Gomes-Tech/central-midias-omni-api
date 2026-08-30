import { Inject, Injectable } from '@nestjs/common';
import { FindAllNotificationsFiltersDTO } from '../dto';
import { NotificationRepository } from '../repository';

@Injectable()
export class FindMyNotificationsUseCase {
  constructor(
    @Inject('NotificationRepository')
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(
    userId: string,
    organizationId: string,
    filters: FindAllNotificationsFiltersDTO = {},
  ) {
    return await this.notificationRepository.findByUser(
      userId,
      organizationId,
      filters,
    );
  }
}
