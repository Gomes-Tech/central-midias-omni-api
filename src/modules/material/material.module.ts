import { PlatformPermissionGuard } from '@common/guards';
import { CategoryModule } from '@modules/category/category.module';
import { MaterialTemplateDocumentService } from '@modules/material-template/services/material-template-document.service';
import { NotificationModule } from '@modules/notification';
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
  ReplaceMaterialFileUseCase,
  ResolveMaterialTagIdsUseCase,
  ResolveMaterialTagsUseCase,
  SearchMaterialsUseCase,
  SendMaterialAcceptanceEmailUseCase,
  SendMaterialAcceptanceExportEmailUseCase,
  SendMaterialNotificationEmailUseCase,
  UpdateMaterialUseCase,
  UploadMaterialFilesUseCase,
  ViewMaterialByIdUseCase,
  ViewMaterialFilesUseCase,
} from './use-cases';

@Module({
  imports: [
    forwardRef(() => CategoryModule),
    TagModule,
    UserModule,
    forwardRef(() => NotificationModule),
  ],
  controllers: [MaterialController],
  providers: [
    PlatformPermissionGuard,
    MaterialRepository,
    MaterialTemplateDocumentService,
    FindAllMaterialsUseCase,
    FindMaterialByIdUseCase,
    FindMaterialsByCategorySlugUseCase,
    ViewMaterialByIdUseCase,
    ViewMaterialFilesUseCase,
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
    ReplaceMaterialFileUseCase,
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
    ReplaceMaterialFileUseCase,
    {
      provide: 'MaterialRepository',
      useExisting: MaterialRepository,
    },
  ],
})
export class MaterialModule {}
