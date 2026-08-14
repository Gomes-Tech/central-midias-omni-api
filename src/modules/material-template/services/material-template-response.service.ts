import { StorageService } from '@infrastructure/providers';
import { AssetStorageService } from '@modules/asset';
import { Injectable } from '@nestjs/common';
import {
  LegacyMaterialTemplateImport,
  MaterialTemplateDocument,
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
      document: document as MaterialTemplateDocument | null,
      legacyImport:
        (template.legacyImport as unknown as LegacyMaterialTemplateImport | null) ??
        null,
      revision: template.revision,
      publishedAt: template.publishedAt,
      updatedAt: template.updatedAt,
      delivery: {
        digital: template.digitalExportMimeType
          ? {
              mimeType: template.digitalExportMimeType as
                | 'image/png'
                | 'image/jpeg',
            }
          : null,
        print: template.printPresetId
          ? { presetId: template.printPresetId }
          : null,
      },
      printPreset: template.printPreset
        ? this.serializePreset(template.printPreset)
        : null,
      printPreflight: template.printPreflight
        ? {
            status: template.printPreflight.status,
            issues: template.printPreflight.issues as Array<{
              code: string;
              message: string;
              layerId?: string;
            }>,
            checkedAt: template.printPreflight.checkedAt,
            templateRevision: template.printPreflight.templateRevision,
            presetUpdatedAt: template.printPreflight.presetUpdatedAt,
          }
        : null,
      baseImage: template.baseFile
        ? {
            id: template.baseFile.id,
            url: await this.storageService.getPublicUrl(
              template.baseFile.imageKey,
              840,
            ),
            mimeType: template.baseFile.mimeType,
            size: template.baseFile.size,
            width: template.baseFile.width,
            height: template.baseFile.height,
          }
        : null,
      assets: assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size,
        width: asset.width,
        height: asset.height,
        url: this.assetStorageService.getPublicUrl(asset.fileKey),
      })),
      missingAssetIds,
    };
  }

  private serializePreset(
    preset: NonNullable<MaterialTemplateRow['printPreset']>,
  ) {
    return {
      ...preset,
      trimWidthMm: Number(preset.trimWidthMm),
      trimHeightMm: Number(preset.trimHeightMm),
      bleedTopMm: Number(preset.bleedTopMm),
      bleedRightMm: Number(preset.bleedRightMm),
      bleedBottomMm: Number(preset.bleedBottomMm),
      bleedLeftMm: Number(preset.bleedLeftMm),
      safeMarginTopMm: Number(preset.safeMarginTopMm),
      safeMarginRightMm: Number(preset.safeMarginRightMm),
      safeMarginBottomMm: Number(preset.safeMarginBottomMm),
      safeMarginLeftMm: Number(preset.safeMarginLeftMm),
      cropMarkOffsetMm: Number(preset.cropMarkOffsetMm),
    };
  }
}
