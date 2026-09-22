import { AssetStorageService } from '@modules/asset';
import { StorageService } from '@infrastructure/providers';
import { MaterialTemplateRow } from '../repository';
import { MaterialTemplateDocumentService } from './material-template-document.service';
import { MaterialTemplateResponseService } from './material-template-response.service';

describe('MaterialTemplateResponseService', () => {
  const repository = { findAssets: jest.fn() };
  const documentService = { validate: jest.fn() };
  const storageService = { getPublicUrl: jest.fn() };
  const assetStorageService = { getPublicUrl: jest.fn() };
  const service = new MaterialTemplateResponseService(
    repository as never,
    documentService as unknown as MaterialTemplateDocumentService,
    storageService as unknown as StorageService,
    assetStorageService as unknown as AssetStorageService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findAssets.mockResolvedValue([]);
    storageService.getPublicUrl.mockImplementation(
      (key: string) => `https://storage.test/${key}`,
    );
  });

  it('retorna as imagens em ordem e usa a primeira como imagem base', async () => {
    const response = await service.resolve({
      id: 'template-id',
      materialId: 'material-id',
      organizationId: 'organization-id',
      status: 'PUBLISHED',
      schemaVersion: 1,
      document: null,
      legacyImport: null,
      revision: 0,
      publishedAt: null,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      allowedExportTypes: ['pdf'],
      printPresetId: null,
      printPreset: null,
      printPreflight: null,
      assets: [],
      baseFile: null,
      material: {
        id: 'material-id',
        categoryId: 'category-id',
        isCustomizable: true,
        deletedAt: null,
        materialFiles: [
          {
            id: 'first-file',
            imageKey: 'materials/material-id/first.png',
            originalName: null,
            mimeType: 'image/png',
            size: 100,
            width: 100,
            height: 50,
            sortOrder: 0,
          },
          {
            id: 'second-file',
            imageKey: 'materials/material-id/second.jpg',
            originalName: 'second.jpg',
            mimeType: 'image/jpeg',
            size: 200,
            width: 200,
            height: 100,
            sortOrder: 1,
          },
        ],
      },
    } as unknown as MaterialTemplateRow);

    expect(response.images).toEqual([
      {
        id: 'first-file',
        originalName: null,
        displayName: 'Imagem 1',
        sortOrder: 0,
        url: 'https://storage.test/materials/material-id/first.png',
        mimeType: 'image/png',
        size: 100,
        width: 100,
        height: 50,
      },
      expect.objectContaining({
        id: 'second-file',
        originalName: 'second.jpg',
        displayName: 'second.jpg',
        sortOrder: 1,
      }),
    ]);
    expect(response.baseImage).toEqual(response.images[0]);
    expect(response.delivery.digital).toEqual({
      mode: 'original',
      mimeTypes: ['image/png', 'image/jpeg'],
    });
  });

  it('indica modo configurado quando PNG ou JPG foi selecionado', async () => {
    const response = await service.resolve({
      id: 'template-id',
      materialId: 'material-id',
      organizationId: 'organization-id',
      status: 'PUBLISHED',
      schemaVersion: 1,
      document: null,
      legacyImport: null,
      revision: 0,
      publishedAt: null,
      updatedAt: new Date(),
      allowedExportTypes: ['jpg'],
      printPresetId: null,
      printPreset: null,
      printPreflight: null,
      assets: [],
      baseFile: null,
      material: {
        id: 'material-id',
        categoryId: 'category-id',
        isCustomizable: true,
        deletedAt: null,
        materialFiles: [
          {
            id: 'file-id',
            imageKey: 'materials/material-id/image.png',
            originalName: 'image.png',
            mimeType: 'image/png',
            size: 100,
            width: 100,
            height: 50,
            sortOrder: 0,
          },
        ],
      },
    } as unknown as MaterialTemplateRow);

    expect(response.delivery.digital).toEqual({
      mode: 'configured',
      mimeTypes: ['image/jpeg'],
    });
  });
});
