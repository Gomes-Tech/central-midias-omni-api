import { PlatformPermissionGuard } from '@common/guards';
import { CategoryModule } from '@modules/category/category.module';
import { TagModule } from '@modules/tag';
import { UserModule } from '@modules/user';
import { forwardRef, Module } from '@nestjs/common';
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
  DownloadMaterialUseCase,
  EnqueueMaterialAcceptanceEmailsUseCase,
  EnqueueMaterialAcceptanceExportUseCase,
  EnqueueMaterialNotificationEmailsUseCase,
  ExportMaterialAcceptanceReportUseCase,
  FindAllMaterialsUseCase,
  FindMaterialByIdUseCase,
  FindMaterialFilesUseCase,
  FindMaterialMosaicUseCase,
  FindMaterialsByCategorySlugUseCase,
  FindMostAccessedMaterialsUseCase,
  ResolveMaterialTagIdsUseCase,
  ResolveMaterialTagsUseCase,
  SearchMaterialsUseCase,
  SendMaterialAcceptanceEmailUseCase,
  SendMaterialAcceptanceExportEmailUseCase,
  SendMaterialNotificationEmailUseCase,
  UpdateMaterialUseCase,
  UploadMaterialFilesUseCase,
  ViewMaterialByIdUseCase,
} from './use-cases';

@Module({
  imports: [forwardRef(() => CategoryModule), TagModule, UserModule],
  controllers: [MaterialController],
  providers: [
    PlatformPermissionGuard,
    MaterialRepository,
    FindAllMaterialsUseCase,
    FindMaterialByIdUseCase,
    FindMaterialsByCategorySlugUseCase,
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
    FindMaterialsByCategorySlugUseCase,
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
