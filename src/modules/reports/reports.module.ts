import { PlatformPermissionGuard } from '@common/guards';
import { UserModule } from '@modules/user';
import { Module } from '@nestjs/common';
import { ReportExportProcessor } from './queue/report-export.processor';
import { ReportRepository } from './repository';
import { ReportsController } from './reports.controller';
import {
  EnqueueReportExportUseCase,
  ExportReportUseCase,
  FindTopMaterialsByDownloadsUseCase,
  FindTopMaterialsByViewsUseCase,
  FindTopUsersByMaterialDownloadsUseCase,
  FindTopUsersByPlatformLoginsUseCase,
  SendReportExportEmailUseCase,
} from './use-cases';

@Module({
  imports: [UserModule],
  controllers: [ReportsController],
  providers: [
    PlatformPermissionGuard,
    ReportRepository,
    FindTopUsersByPlatformLoginsUseCase,
    FindTopUsersByMaterialDownloadsUseCase,
    FindTopMaterialsByViewsUseCase,
    FindTopMaterialsByDownloadsUseCase,
    ExportReportUseCase,
    EnqueueReportExportUseCase,
    SendReportExportEmailUseCase,
    ReportExportProcessor,
    {
      provide: 'ReportRepository',
      useExisting: ReportRepository,
    },
  ],
})
export class ReportsModule {}
