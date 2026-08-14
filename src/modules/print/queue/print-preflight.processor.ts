import {
  PRINT_PREFLIGHT_JOB,
  PRINT_PREFLIGHT_QUEUE,
} from '@infrastructure/queue';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrintPreflightService } from '../services/print-preflight.service';

@Processor(PRINT_PREFLIGHT_QUEUE, { concurrency: 1 })
export class PrintPreflightProcessor extends WorkerHost {
  constructor(private readonly preflight: PrintPreflightService) {
    super();
  }

  async process(job: Job<{ presetId: string }>) {
    if (job.name !== PRINT_PREFLIGHT_JOB) return;
    await this.preflight.runForPreset(job.data.presetId);
  }
}
