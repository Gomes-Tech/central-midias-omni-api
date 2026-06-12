import { PlatformPermissionGuard } from '@common/guards';
import { CategoryModule } from '@modules/category';
import { TagModule } from '@modules/tag';
import { Module } from '@nestjs/common';
import { MaterialController } from './material.controller';
import { MaterialAcceptanceEmailProcessor } from './queue/material-acceptance-email.processor';
import { MaterialRepository } from './repository';
import {
  AcceptMaterialUseCase,
  CreateMaterialUseCase,
  DeleteMaterialFileUseCase,
  DeleteMaterialUseCase,
  EnqueueMaterialAcceptanceEmailsUseCase,
  ExportMaterialAcceptanceReportUseCase,
  FindAllMaterialsUseCase,
  FindMaterialFilesUseCase,
  FindMaterialByIdUseCase,
  ResolveMaterialTagIdsUseCase,
  ResolveMaterialTagsUseCase,
  SearchMaterialsUseCase,
  SendMaterialAcceptanceEmailUseCase,
  UploadMaterialFilesUseCase,
  UpdateMaterialUseCase,
} from './use-cases';

@Module({
  imports: [CategoryModule, TagModule],
  controllers: [MaterialController],
  providers: [
    PlatformPermissionGuard,
    MaterialRepository,
    FindAllMaterialsUseCase,
    FindMaterialByIdUseCase,
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
    EnqueueMaterialAcceptanceEmailsUseCase,
    SendMaterialAcceptanceEmailUseCase,
    MaterialAcceptanceEmailProcessor,
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
