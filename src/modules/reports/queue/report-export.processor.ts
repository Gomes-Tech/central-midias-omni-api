import {
  REPORT_EXPORT_JOB,
  REPORT_EXPORT_QUEUE,
} from '@infrastructure/queue';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ReportExportJobPayload } from './report-export.job';
import { SendReportExportEmailUseCase } from '../use-cases/send-report-export-email.use-case';

@Processor(REPORT_EXPORT_QUEUE)
export class ReportExportProcessor extends WorkerHost {
  constructor(
    private readonly sendReportExportEmailUseCase: SendReportExportEmailUseCase,
  ) {
    super();
  }

  async process(job: Job<ReportExportJobPayload>): Promise<void> {
    if (job.name !== REPORT_EXPORT_JOB) {
      return;
    }

    await this.sendReportExportEmailUseCase.execute(job.data);
  }
}
