import { PlatformPermissionGuard } from '@common/guards';
import { AssetModule } from '@modules/asset';
import { MaterialModule } from '@modules/material';
import { forwardRef, Module } from '@nestjs/common';
import { MaterialTemplateController } from './material-template.controller';
import { MaterialTemplateRepository } from './repository';
import {
  MaterialTemplateDocumentService,
  MaterialTemplateImageService,
  MaterialTemplateResponseService,
} from './services';
import {
  GetAdminMaterialTemplateUseCase,
  GetPublishedMaterialTemplateUseCase,
  PublishMaterialTemplateUseCase,
  ReplaceMaterialTemplateBaseUseCase,
  SaveMaterialTemplateUseCase,
} from './use-cases';

@Module({
  imports: [forwardRef(() => AssetModule), MaterialModule],
  controllers: [MaterialTemplateController],
  providers: [
    PlatformPermissionGuard,
    MaterialTemplateRepository,
    MaterialTemplateDocumentService,
    MaterialTemplateImageService,
    MaterialTemplateResponseService,
    GetAdminMaterialTemplateUseCase,
    GetPublishedMaterialTemplateUseCase,
    SaveMaterialTemplateUseCase,
    PublishMaterialTemplateUseCase,
    ReplaceMaterialTemplateBaseUseCase,
  ],
  exports: [MaterialTemplateRepository, MaterialTemplateDocumentService],
})
export class MaterialTemplateModule {}
