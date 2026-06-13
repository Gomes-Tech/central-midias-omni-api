import {
  MATERIAL_NOTIFICATION_EMAIL_JOB,
  MATERIAL_NOTIFICATION_EMAIL_QUEUE,
} from '@infrastructure/queue';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MaterialNotificationEmailJobPayload } from '../queue/material-notification-email.job';
import { SendMaterialNotificationEmailUseCase } from '../use-cases/send-material-notification-email.use-case';

@Processor(MATERIAL_NOTIFICATION_EMAIL_QUEUE)
export class MaterialNotificationEmailProcessor extends WorkerHost {
  constructor(
    private readonly sendMaterialNotificationEmailUseCase: SendMaterialNotificationEmailUseCase,
  ) {
    super();
  }

  async process(
    job: Job<MaterialNotificationEmailJobPayload>,
  ): Promise<void> {
    if (job.name !== MATERIAL_NOTIFICATION_EMAIL_JOB) {
      return;
    }

    await this.sendMaterialNotificationEmailUseCase.execute(job.data);
  }
}
