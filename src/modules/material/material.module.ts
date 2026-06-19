import { PlatformPermissionGuard } from '@common/guards';
import { CategoryModule } from '@modules/category';
import { TagModule } from '@modules/tag';
import { UserModule } from '@modules/user';
import { Module } from '@nestjs/common';
import { MaterialController } from './material.controller';
import { MaterialAcceptanceEmailProcessor } from './queue/material-acceptance-email.processor';
import { MaterialAcceptanceExportProcessor } from './queue/material-acceptance-export.processor';
import { MaterialNotificationEmailProcessor } from './queue/material-notification-email.processor';
import { MaterialRepository } from './repository';
import {
  AcceptMaterialUseCase,
  CreateMaterialUseCase,
  DeleteMaterialFileUseCase,
  DeleteMaterialUseCase,
  EnqueueMaterialAcceptanceExportUseCase,
  EnqueueMaterialAcceptanceEmailsUseCase,
  EnqueueMaterialNotificationEmailsUseCase,
  ExportMaterialAcceptanceReportUseCase,
  FindAllMaterialsUseCase,
  FindMaterialFilesUseCase,
  FindMaterialByIdUseCase,
  ViewMaterialByIdUseCase,
  DownloadMaterialUseCase,
  FindMostAccessedMaterialsUseCase,
  FindMaterialMosaicUseCase,
  ResolveMaterialTagIdsUseCase,
  ResolveMaterialTagsUseCase,
  SearchMaterialsUseCase,
  SendMaterialAcceptanceExportEmailUseCase,
  SendMaterialAcceptanceEmailUseCase,
  SendMaterialNotificationEmailUseCase,
  UploadMaterialFilesUseCase,
  UpdateMaterialUseCase,
} from './use-cases';

@Module({
  imports: [CategoryModule, TagModule, UserModule],
  controllers: [MaterialController],
  providers: [
    PlatformPermissionGuard,
    MaterialRepository,
    FindAllMaterialsUseCase,
    FindMaterialByIdUseCase,
    ViewMaterialByIdUseCase,
    DownloadMaterialUseCase,
    FindMostAccessedMaterialsUseCase,
    FindMaterialMosaicUseCase,
    SearchMaterialsUseCase,
    ResolveMaterialTagsUseCase,
    ResolveMaterialTagIdsUseCase,
    CreateMaterialUseCase,
    UpdateMaterialUseCase,
    DeleteMaterialUseCase,
    UploadMaterialFilesUseCase,
    FindMaterialFilesUseCase,
    DeleteMaterialFileUseCase,
    AcceptMaterialUseCase,
    ExportMaterialAcceptanceReportUseCase,
    EnqueueMaterialAcceptanceExportUseCase,
    EnqueueMaterialAcceptanceEmailsUseCase,
    EnqueueMaterialNotificationEmailsUseCase,
    SendMaterialAcceptanceExportEmailUseCase,
    SendMaterialAcceptanceEmailUseCase,
    SendMaterialNotificationEmailUseCase,
    MaterialAcceptanceEmailProcessor,
    MaterialAcceptanceExportProcessor,
    MaterialNotificationEmailProcessor,
    {
      provide: 'MaterialRepository',
      useExisting: MaterialRepository,
    },
  ],
  exports: [
    MaterialRepository,
    FindAllMaterialsUseCase,
    FindMaterialByIdUseCase,
    SearchMaterialsUseCase,
    ResolveMaterialTagsUseCase,
    CreateMaterialUseCase,
    UpdateMaterialUseCase,
    DeleteMaterialUseCase,
    UploadMaterialFilesUseCase,
    FindMaterialFilesUseCase,
    DeleteMaterialFileUseCase,
    {
      provide: 'MaterialRepository',
      useExisting: MaterialRepository,
    },
  ],
})
export class MaterialModule {}
