import { PlatformPermissionGuard } from '@common/guards';
import { CategoryModule } from '@modules/category';
import { TagModule } from '@modules/tag';
import { Module } from '@nestjs/common';
import { MaterialController } from './material.controller';
import { MaterialRepository } from './repository';
import {
  CreateMaterialUseCase,
  DeleteMaterialFileUseCase,
  DeleteMaterialUseCase,
  FindAllMaterialsUseCase,
  FindMaterialFilesUseCase,
  FindMaterialByIdUseCase,
  ResolveMaterialTagIdsUseCase,
  ResolveMaterialTagsUseCase,
  SearchMaterialsUseCase,
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
