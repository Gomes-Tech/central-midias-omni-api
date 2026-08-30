import {
  IN_APP_NOTIFICATION_JOB,
  IN_APP_NOTIFICATION_QUEUE,
} from '@infrastructure/queue';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InAppNotificationJobPayload } from './in-app-notification.job';
import { CreateInAppNotificationUseCase } from '../use-cases/create-in-app-notification.use-case';

@Processor(IN_APP_NOTIFICATION_QUEUE)
export class InAppNotificationProcessor extends WorkerHost {
  constructor(
    private readonly createInAppNotificationUseCase: CreateInAppNotificationUseCase,
  ) {
    super();
  }

  async process(job: Job<InAppNotificationJobPayload>): Promise<void> {
    if (job.name !== IN_APP_NOTIFICATION_JOB) {
      return;
    }

    await this.createInAppNotificationUseCase.execute(job.data);
  }
}
