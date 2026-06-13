import { LoggerService } from '@infrastructure/log';
import { MailService } from '@infrastructure/providers';
import { Injectable } from '@nestjs/common';
import { MaterialAcceptanceExportJobPayload } from '../queue/material-acceptance-export.job';
import { ExportMaterialAcceptanceReportUseCase } from './export-material-acceptance-report.use-case';

@Injectable()
export class SendMaterialAcceptanceExportEmailUseCase {
  constructor(
    private readonly exportMaterialAcceptanceReportUseCase: ExportMaterialAcceptanceReportUseCase,
    private readonly mailService: MailService,
    private readonly logger: LoggerService,
  ) {}

  async execute(payload: MaterialAcceptanceExportJobPayload): Promise<void> {
    const { filename, content } =
      await this.exportMaterialAcceptanceReportUseCase.execute(
        payload.materialId,
        payload.organizationId,
      );

    if (process.env.NODE_ENV === 'prod') {
      await this.mailService.sendMail({
        to: payload.email,
        subject: 'Relatório de aceite de material',
        template: 'material-acceptance-export',
        context: {
          name: payload.name,
          filename,
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

    void this.logger.info(
      'Exportação de relatório de aceite enfileirada (dev)',
      {
        materialId: payload.materialId,
        organizationId: payload.organizationId,
        email: payload.email,
        filename,
      },
    );
  }
}
