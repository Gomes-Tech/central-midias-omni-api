import {
  MATERIAL_ACCEPTANCE_EMAIL_JOB,
  MATERIAL_ACCEPTANCE_EMAIL_QUEUE,
} from '@infrastructure/queue';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MaterialAcceptanceEmailJobPayload } from '../queue/material-acceptance-email.job';
import { SendMaterialAcceptanceEmailUseCase } from '../use-cases/send-material-acceptance-email.use-case';

@Processor(MATERIAL_ACCEPTANCE_EMAIL_QUEUE)
export class MaterialAcceptanceEmailProcessor extends WorkerHost {
  constructor(
    private readonly sendMaterialAcceptanceEmailUseCase: SendMaterialAcceptanceEmailUseCase,
  ) {
    super();
  }

  async process(
    job: Job<MaterialAcceptanceEmailJobPayload>,
  ): Promise<void> {
    if (job.name !== MATERIAL_ACCEPTANCE_EMAIL_JOB) {
      return;
    }

    await this.sendMaterialAcceptanceEmailUseCase.execute(job.data);
  }
}
