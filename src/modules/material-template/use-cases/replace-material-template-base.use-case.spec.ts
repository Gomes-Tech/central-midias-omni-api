import { StorageService } from '@infrastructure/providers';
import { makeUploadFile } from '@modules/material/use-cases/test-helpers';
import {
  MaterialTemplateDocumentService,
  MaterialTemplateImageService,
  MaterialTemplateResponseService,
} from '../services';
import { MaterialTemplateRepository, MaterialTemplateRow } from '../repository';
import { ReplaceMaterialTemplateBaseUseCase } from './replace-material-template-base.use-case';

function makePngFile(originalname = 'base.png'): Express.Multer.File {
  const buffer = Buffer.alloc(24);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buffer);
  buffer.writeUInt32BE(540, 16);
  buffer.writeUInt32BE(540, 20);
  return makeUploadFile({
    fieldname: 'file',
    originalname,
    mimetype: 'image/png',
    size: buffer.length,
    buffer,
  });
}

function makeTemplate(
  overrides: Partial<MaterialTemplateRow> = {},
): MaterialTemplateRow {
  return {
    id: 'template-id',
    organizationId: 'org-id',
    materialId: 'material-id',
    baseMaterialFileId: 'file-id',
    printPresetId: null,
    digitalExportMimeType: null,
    allowedExportTypes: [],
    status: 'PUBLISHED',
    schemaVersion: 1,
    document: {
      version: 1,
      canvas: { width: 1080, height: 1080 },
      layerOrder: ['text'],
      layers: [
        {
          id: 'text',
          type: 'text',
          name: 'Nome',
          value: 'Nome',
          x: 10,
          y: 20,
          rotation: 0,
          fontSize: 32,
          fontFamily: 'Arial',
          fill: '#111111',
          isVisible: true,
          editableProperties: ['value'],
          profileBinding: 'NAME',
        },
      ],
    },
    legacyImport: null,
    revision: 3,
    publishedAt: new Date(),
    updatedAt: new Date(),
    baseFile: {
      id: 'file-id',
      imageKey: 'materials/material-id/base.png',
      originalName: 'base.png',
      mimeType: 'image/png',
      size: 100,
      width: 1080,
      height: 1080,
      sortOrder: 0,
    },
    material: {
      id: 'material-id',
      categoryId: 'category-id',
      isCustomizable: true,
      deletedAt: null,
      materialFiles: [
        {
          id: 'file-id',
          imageKey: 'materials/material-id/base.png',
          originalName: 'base.png',
          mimeType: 'image/png',
          size: 100,
          width: 1080,
          height: 1080,
          sortOrder: 0,
        },
      ],
    },
    assets: [],
    printPreset: null,
    printPreflight: null,
    ...overrides,
  } as MaterialTemplateRow;
}

describe('ReplaceMaterialTemplateBaseUseCase', () => {
  let repository: jest.Mocked<MaterialTemplateRepository>;
  let responseService: { resolve: jest.Mock };
  let storageService: jest.Mocked<
    Pick<StorageService, 'uploadFile' | 'deleteFile'>
  >;
  let useCase: ReplaceMaterialTemplateBaseUseCase;

  beforeEach(() => {
    repository = {
      findOrThrow: jest.fn(),
      replaceBaseFile: jest.fn(),
    } as unknown as jest.Mocked<MaterialTemplateRepository>;
    responseService = { resolve: jest.fn() };
    storageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    };
    storageService.deleteFile.mockResolvedValue(undefined);

    useCase = new ReplaceMaterialTemplateBaseUseCase(
      repository,
      new MaterialTemplateDocumentService(),
      new MaterialTemplateImageService(),
      responseService as unknown as MaterialTemplateResponseService,
      storageService as unknown as StorageService,
    );
  });

  it('recusa material com mais de uma imagem e pede a rota nova', async () => {
    repository.findOrThrow.mockResolvedValue(
      makeTemplate({
        material: {
          id: 'material-id',
          categoryId: 'category-id',
          isCustomizable: true,
          deletedAt: null,
          materialFiles: [
            {
              id: 'file-id',
              imageKey: 'materials/material-id/base.png',
              originalName: 'base.png',
              mimeType: 'image/png',
              size: 100,
              width: 1080,
              height: 1080,
              sortOrder: 0,
            },
            {
              id: 'file-2',
              imageKey: 'materials/material-id/verso.png',
              originalName: 'verso.png',
              mimeType: 'image/png',
              size: 100,
              width: 1080,
              height: 1080,
              sortOrder: 1,
            },
          ],
        },
      }),
    );

    await expect(
      useCase.execute('material-id', 'org-id', 'user-id', [makePngFile()]),
    ).rejects.toThrow('deve usar PUT /materials/:id/files/:fileId');
    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(repository.replaceBaseFile).not.toHaveBeenCalled();
  });

  it('substitui a base de material com uma imagem e apaga o objeto anterior', async () => {
    const template = makeTemplate();
    repository.findOrThrow.mockResolvedValue(template);
    storageService.uploadFile.mockResolvedValue({
      path: 'materials/material-id/nova.png',
    });
    repository.replaceBaseFile.mockResolvedValue({
      template,
      previousFileKey: 'materials/material-id/base.png',
    });
    responseService.resolve.mockResolvedValue({ id: 'template-id' });

    await expect(
      useCase.execute('material-id', 'org-id', 'user-id', [makePngFile()]),
    ).resolves.toEqual({ id: 'template-id' });

    expect(repository.replaceBaseFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileKey: 'materials/material-id/nova.png',
        mimeType: 'image/png',
        width: 540,
        height: 540,
        document: expect.objectContaining({
          canvas: { width: 540, height: 540 },
        }),
      }),
    );
    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'materials/material-id/base.png',
    ]);
  });
});
