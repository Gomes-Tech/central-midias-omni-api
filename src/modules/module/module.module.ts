import { PlatformPermissionGuard } from '@common/guards';
import { Module } from '@nestjs/common';
import { ModuleController } from './module.controller';
import { ModuleRepository } from './repository';
import {
  CreateModuleUseCase,
  DeleteModuleUseCase,
  FindAllModuleUseCase,
  FindAllSelectModuleUseCase,
  FindModuleByIdUseCase,
  UpdateModuleUseCase,
} from './use-cases';

@Module({
  controllers: [ModuleController],
  providers: [
    PlatformPermissionGuard,
    ModuleRepository,
    FindAllModuleUseCase,
    FindAllSelectModuleUseCase,
    FindModuleByIdUseCase,
    CreateModuleUseCase,
    UpdateModuleUseCase,
    DeleteModuleUseCase,
    {
      provide: 'ModuleRepository',
      useExisting: ModuleRepository,
    },
  ],
  exports: [
    ModuleRepository,
    FindAllModuleUseCase,
    FindAllSelectModuleUseCase,
    FindModuleByIdUseCase,
    CreateModuleUseCase,
    UpdateModuleUseCase,
    DeleteModuleUseCase,
    {
      provide: 'ModuleRepository',
      useExisting: ModuleRepository,
    },
  ],
})
export class ModuleModule {}
