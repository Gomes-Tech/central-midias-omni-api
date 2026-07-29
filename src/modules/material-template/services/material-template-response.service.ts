import { StorageService } from '@infrastructure/providers';
import { AssetStorageService } from '@modules/asset';
import { Injectable } from '@nestjs/common';
import {
  LegacyMaterialTemplateImport,
  MaterialTemplateDocumentV1,
  MaterialTemplateResponse,
} from '../entities';
import { MaterialTemplateRepository, MaterialTemplateRow } from '../repository';
import { MaterialTemplateDocumentService } from './material-template-document.service';

@Injectable()
export class MaterialTemplateResponseService {
  constructor(
    private readonly repository: MaterialTemplateRepository,
    private readonly documentService: MaterialTemplateDocumentService,
    private readonly storageService: StorageService,
    private readonly assetStorageService: AssetStorageService,
  ) {}

  async resolve(
    template: MaterialTemplateRow,
  ): Promise<MaterialTemplateResponse> {
    const document = template.document
      ? this.documentService.validate(template.document)
      : null;
    const requestedAssetIds = document
      ? this.documentService.getAssetIds(document)
      : [];
    const assets = await this.repository.findAssets(
      requestedAssetIds,
      template.organizationId,
    );
    const foundIds = new Set(assets.map((asset) => asset.id));
    const missingAssetIds = requestedAssetIds.filter((id) => !foundIds.has(id));

    return {
      id: template.id,
      materialId: template.materialId,
      status: template.status,
      schemaVersion: template.schemaVersion,
      document: document as MaterialTemplateDocumentV1 | null,
      legacyImport:
        (template.legacyImport as unknown as LegacyMaterialTemplateImport | null) ??
        null,
      revision: template.revision,
      publishedAt: template.publishedAt,
      updatedAt: template.updatedAt,
      baseImage: template.baseFile
        ? {
            id: template.baseFile.id,
            url: await this.storageService.getPublicUrl(
              template.baseFile.imageKey,
              840,
            ),
            mimeType: template.baseFile.mimeType,
            size: template.baseFile.size,
          }
        : null,
      assets: assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        mimeType: asset.mimeType,
        url: this.assetStorageService.getPublicUrl(asset.fileKey),
      })),
      missingAssetIds,
    };
  }
}
