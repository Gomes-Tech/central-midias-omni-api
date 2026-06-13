import { LoggerService } from '@infrastructure/log';
import { MailService } from '@infrastructure/providers';
import { Injectable } from '@nestjs/common';
import { REPORT_TYPE_LABELS } from '../entities';
import { ReportExportJobPayload } from '../queue/report-export.job';
import { ExportReportUseCase } from './export-report.use-case';

@Injectable()
export class SendReportExportEmailUseCase {
  constructor(
    private readonly exportReportUseCase: ExportReportUseCase,
    private readonly mailService: MailService,
    private readonly logger: LoggerService,
  ) {}

  async execute(payload: ReportExportJobPayload): Promise<void> {
    const { filename, content } = await this.exportReportUseCase.execute(
      payload.reportType,
      payload.organizationId,
    );

    const reportLabel = REPORT_TYPE_LABELS[payload.reportType];

    if (process.env.NODE_ENV === 'prod') {
      await this.mailService.sendMail({
        to: payload.email,
        subject: reportLabel,
        template: 'report-export',
        context: {
          name: payload.name,
          filename,
          reportLabel,
        },
        attachments: [
          {
            filename,
            content,
            contentType: 'text/csv; charset=utf-8',
          },
        ],
      });

      return;
    }

    void this.logger.info('Exportação de relatório enfileirada (dev)', {
      reportType: payload.reportType,
      organizationId: payload.organizationId,
      email: payload.email,
      filename,
    });
  }
}
