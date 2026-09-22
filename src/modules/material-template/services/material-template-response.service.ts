import { StorageService } from '@infrastructure/providers';
import { AssetStorageService } from '@modules/asset';
import { toDigitalMimeTypes } from '@modules/material/dto/material-export-types';
import type { MaterialExportType } from '@modules/material/dto/material-export-types';
import { Injectable } from '@nestjs/common';
import {
  LegacyMaterialTemplateImport,
  MaterialTemplateDocument,
  MaterialTemplateImage,
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
    const exportTypes = (template.allowedExportTypes ??
      []) as MaterialExportType[];
    const images = await Promise.all(
      template.material.materialFiles.map(
        async (file, index): Promise<MaterialTemplateImage> => ({
          id: file.id,
          originalName: file.originalName,
          displayName: file.originalName ?? `Imagem ${index + 1}`,
          sortOrder: file.sortOrder,
          url: await this.storageService.getPublicUrl(file.imageKey, 840),
          mimeType: file.mimeType,
          size: file.size,
          width: file.width,
          height: file.height,
        }),
      ),
    );
    const digitalMode = exportTypes.some(
      (type) => type === 'png' || type === 'jpg',
    )
      ? 'configured'
      : 'original';
    const mimeTypes =
      digitalMode === 'configured'
        ? toDigitalMimeTypes(exportTypes, images[0]?.mimeType)
        : [
            ...new Set(
              images.flatMap((image) => toDigitalMimeTypes([], image.mimeType)),
            ),
          ];

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
        exportTypes,
        digital: { mode: digitalMode, mimeTypes },
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
              materialFileId?: string;
            }>,
            checkedAt: template.printPreflight.checkedAt,
            templateRevision: template.printPreflight.templateRevision,
            presetUpdatedAt: template.printPreflight.presetUpdatedAt,
          }
        : null,
      images,
      baseImage: images[0] ?? null,
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
