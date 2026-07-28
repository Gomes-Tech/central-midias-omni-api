import { PlatformPermissionGuard } from '@common/guards';
import { Module } from '@nestjs/common';
import { AssetController } from './asset.controller';
import { AssetRepository } from './repository';
import { AssetFileValidationService, AssetStorageService } from './services';
import {
  CreateAssetsUseCase,
  DeleteAssetUseCase,
  FindAllAssetsUseCase,
  FindAssetByIdUseCase,
  GetAssetUseCase,
  UpdateAssetUseCase,
} from './use-cases';

@Module({
  controllers: [AssetController],
  providers: [
    PlatformPermissionGuard,
    AssetRepository,
    AssetFileValidationService,
    AssetStorageService,
    FindAllAssetsUseCase,
    FindAssetByIdUseCase,
    GetAssetUseCase,
    CreateAssetsUseCase,
    UpdateAssetUseCase,
    DeleteAssetUseCase,
  ],
  exports: [AssetRepository, AssetStorageService],
})
export class AssetModule {}
