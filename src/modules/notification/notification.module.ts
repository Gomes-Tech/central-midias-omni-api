import { MaterialModule } from '@modules/material/material.module';
import { forwardRef, Module } from '@nestjs/common';
import { NotificationGateway } from './gateway/notification.gateway';
import { NotificationController } from './notification.controller';
import { InAppNotificationProcessor } from './queue/in-app-notification.processor';
import { NotificationRepository } from './repository';
import {
  CountUnreadNotificationsUseCase,
  CreateInAppNotificationUseCase,
  EnqueueInAppNotificationsUseCase,
  FindMyNotificationsUseCase,
  MarkAllNotificationsAsReadUseCase,
  MarkNotificationAsReadUseCase,
} from './use-cases';

@Module({
  imports: [forwardRef(() => MaterialModule)],
  controllers: [NotificationController],
  providers: [
    NotificationRepository,
    FindMyNotificationsUseCase,
    CountUnreadNotificationsUseCase,
    MarkNotificationAsReadUseCase,
    MarkAllNotificationsAsReadUseCase,
    CreateInAppNotificationUseCase,
    EnqueueInAppNotificationsUseCase,
    InAppNotificationProcessor,
    NotificationGateway,
    {
      provide: 'NotificationRepository',
      useExisting: NotificationRepository,
    },
  ],
  exports: [
    NotificationRepository,
    EnqueueInAppNotificationsUseCase,
    {
      provide: 'NotificationRepository',
      useExisting: NotificationRepository,
    },
  ],
})
export class NotificationModule {}
