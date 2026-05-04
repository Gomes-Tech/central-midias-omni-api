import { PlatformPermissionGuard } from '@common/guards';
import { CategoryModule } from '@modules/category';
import { Module } from '@nestjs/common';
import { MaterialController } from './material.controller';
import { MaterialRepository } from './repository';
import {
  CreateMaterialUseCase,
  DeleteMaterialUseCase,
  FindAllMaterialsUseCase,
  FindMaterialByIdUseCase,
  UpdateMaterialUseCase,
} from './use-cases';

@Module({
  imports: [CategoryModule],
  controllers: [MaterialController],
  providers: [
    PlatformPermissionGuard,
    MaterialRepository,
    FindAllMaterialsUseCase,
    FindMaterialByIdUseCase,
    CreateMaterialUseCase,
    UpdateMaterialUseCase,
    DeleteMaterialUseCase,
    {
      provide: 'MaterialRepository',
      useExisting: MaterialRepository,
    },
  ],
  exports: [
    MaterialRepository,
    FindAllMaterialsUseCase,
    FindMaterialByIdUseCase,
    CreateMaterialUseCase,
    UpdateMaterialUseCase,
    DeleteMaterialUseCase,
    {
      provide: 'MaterialRepository',
      useExisting: MaterialRepository,
    },
  ],
})
export class MaterialModule {}
