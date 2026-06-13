import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { REPORT_EXPORT_JOB, REPORT_EXPORT_QUEUE } from '@infrastructure/queue';
import { FindUserByIdUseCase } from '@modules/user';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { REPORT_TYPE_LABELS, ReportType } from '../entities';
import { ReportExportJobPayload } from '../queue/report-export.job';

const VALID_REPORT_TYPES = new Set<string>(Object.values(ReportType));

@Injectable()
export class EnqueueReportExportUseCase {
  constructor(
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    @InjectQueue(REPORT_EXPORT_QUEUE)
    private readonly reportExportQueue: Queue<ReportExportJobPayload>,
    private readonly logger: LoggerService,
  ) {}

  async execute(
    reportType: ReportType,
    organizationId: string,
    userId: string,
  ): Promise<{ enqueued: boolean }> {
    if (!VALID_REPORT_TYPES.has(reportType)) {
      throw new BadRequestException('Tipo de relatório inválido');
    }

    const user = await this.findUserByIdUseCase.execute(userId);

    const payload: ReportExportJobPayload = {
      reportType,
      organizationId,
      userId,
      email: user.email,
      name: user.name,
    };

    await this.reportExportQueue.add(REPORT_EXPORT_JOB, payload, {
      jobId: `${reportType}:${organizationId}:${userId}:export`,
    });

    void this.logger.info('Exportação de relatório enfileirada', {
      reportType,
      organizationId,
      userId,
      reportLabel: REPORT_TYPE_LABELS[reportType],
    });

    return { enqueued: true };
  }
}
