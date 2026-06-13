import {
  MATERIAL_ACCEPTANCE_EXPORT_JOB,
  MATERIAL_ACCEPTANCE_EXPORT_QUEUE,
} from '@infrastructure/queue';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MaterialAcceptanceExportJobPayload } from '../queue/material-acceptance-export.job';
import { SendMaterialAcceptanceExportEmailUseCase } from '../use-cases/send-material-acceptance-export-email.use-case';

@Processor(MATERIAL_ACCEPTANCE_EXPORT_QUEUE)
export class MaterialAcceptanceExportProcessor extends WorkerHost {
  constructor(
    private readonly sendMaterialAcceptanceExportEmailUseCase: SendMaterialAcceptanceExportEmailUseCase,
  ) {
    super();
  }

  async process(job: Job<MaterialAcceptanceExportJobPayload>): Promise<void> {
    if (job.name !== MATERIAL_ACCEPTANCE_EXPORT_JOB) {
      return;
    }

    await this.sendMaterialAcceptanceExportEmailUseCase.execute(job.data);
  }
}
