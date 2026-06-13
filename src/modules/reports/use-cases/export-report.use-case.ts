import { BadRequestException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { ReportType } from '../entities';
import { ReportRepository } from '../repository';
import {
  buildReportExportFilename,
  buildTopMaterialsByDownloadsCsv,
  buildTopMaterialsByViewsCsv,
  buildTopUsersByMaterialDownloadsCsv,
  buildTopUsersByPlatformLoginsCsv,
} from '../utils/report-csv';

@Injectable()
export class ExportReportUseCase {
  constructor(
    @Inject('ReportRepository')
    private readonly reportRepository: ReportRepository,
  ) {}

  async execute(
    reportType: ReportType,
    organizationId: string,
  ): Promise<{ filename: string; content: string }> {
    switch (reportType) {
      case ReportType.USERS_TOP_LOGINS: {
        const rows =
          await this.reportRepository.findAllTopUsersByPlatformLogins(
            organizationId,
          );

        return {
          filename: buildReportExportFilename('usuarios-logins'),
          content: buildTopUsersByPlatformLoginsCsv(rows),
        };
      }
      case ReportType.USERS_TOP_DOWNLOADS: {
        const rows =
          await this.reportRepository.findAllTopUsersByMaterialDownloads(
            organizationId,
          );

        return {
          filename: buildReportExportFilename('usuarios-downloads'),
          content: buildTopUsersByMaterialDownloadsCsv(rows),
        };
      }
      case ReportType.MATERIALS_TOP_VIEWS: {
        const rows =
          await this.reportRepository.findAllTopMaterialsByViews(
            organizationId,
          );

        return {
          filename: buildReportExportFilename('materiais-visualizacoes'),
          content: buildTopMaterialsByViewsCsv(rows),
        };
      }
      case ReportType.MATERIALS_TOP_DOWNLOADS: {
        const rows =
          await this.reportRepository.findAllTopMaterialsByDownloads(
            organizationId,
          );

        return {
          filename: buildReportExportFilename('materiais-downloads'),
          content: buildTopMaterialsByDownloadsCsv(rows),
        };
      }
      default:
        throw new BadRequestException('Tipo de relatório inválido');
    }
  }
}
