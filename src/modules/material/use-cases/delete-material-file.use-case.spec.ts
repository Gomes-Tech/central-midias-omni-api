import { BadRequestException, NotFoundException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { MaterialTemplateDocumentService } from '@modules/material-template/services/material-template-document.service';
import { MaterialRepository } from '../repository';
import { DeleteMaterialFileUseCase } from './delete-material-file.use-case';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';
import { makeMaterialFile } from './test-helpers';

describe('DeleteMaterialFileUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let findMaterialByIdUseCase: { execute: jest.Mock };
  let storageService: jest.Mocked<Pick<StorageService, 'deleteFile'>>;
  let useCase: DeleteMaterialFileUseCase;

  beforeEach(() => {
    materialRepository = {
      findFileById: jest.fn(),
      deleteFile: jest.fn(),
      findCustomizableUploadContext: jest.fn(),
      deleteCustomizableFile: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;
    findMaterialByIdUseCase = { execute: jest.fn() };
    storageService = {
      deleteFile: jest.fn(),
    };

    useCase = new DeleteMaterialFileUseCase(
      materialRepository,
      findMaterialByIdUseCase as unknown as FindMaterialByIdUseCase,
      storageService as unknown as StorageService,
      new MaterialTemplateDocumentService(),
    );
  });

  it('deve remover registro e arquivo da AWS', async () => {
    materialRepository.findFileById.mockResolvedValue(
      makeMaterialFile({ fileKey: 'materials/material-id/file.pdf' }),
    );
    materialRepository.deleteFile.mockResolvedValue(undefined);
    findMaterialByIdUseCase.execute.mockResolvedValue({ id: 'material-id' });

    await expect(
      useCase.execute('material-id', 'file-id', 'org-id', 'user-id'),
    ).resolves.toBe(undefined);

    expect(findMaterialByIdUseCase.execute).toHaveBeenCalledWith(
      'material-id',
      'org-id',
    );
    expect(materialRepository.deleteFile).toHaveBeenCalledWith(
      'file-id',
      'material-id',
      'org-id',
      'user-id',
    );
    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'materials/material-id/file.pdf',
    ]);
  });

  it('deve lançar NotFound quando arquivo não pertencer ao material', async () => {
    findMaterialByIdUseCase.execute.mockResolvedValue({ id: 'material-id' });
    materialRepository.findFileById.mockResolvedValue(null);

    await expect(
      useCase.execute('material-id', 'missing-file', 'org-id', 'user-id'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(materialRepository.deleteFile).not.toHaveBeenCalled();
    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });

  const assetLayer = {
    id: 'asset-1',
    type: 'asset' as const,
    name: 'Logo',
    assetId: 'library-asset-1',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    rotation: 0,
    isVisible: true,
    editableProperties: [] as [],
  };
  const v3Document = {
    version: 3,
    pages: [
      {
        materialFileId: 'file-1',
        canvas: { width: 100, height: 80 },
        layerOrder: ['asset-1'],
        layers: [assetLayer],
      },
      {
        materialFileId: 'file-2',
        canvas: { width: 200, height: 90 },
        layerOrder: [],
        layers: [],
      },
      {
        materialFileId: 'file-3',
        canvas: { width: 300, height: 100 },
        layerOrder: ['asset-2'],
        layers: [{ ...assetLayer, id: 'asset-2', assetId: 'library-asset-2' }],
      },
    ],
  };
  const customizableFiles = [
    { id: 'file-1', width: 100, height: 80, sortOrder: 0 },
    { id: 'file-2', width: 200, height: 90, sortOrder: 2 },
    { id: 'file-3', width: 300, height: 100, sortOrder: 5 },
  ];

  function mockCustomizable(document: unknown = v3Document) {
    findMaterialByIdUseCase.execute.mockResolvedValue({
      id: 'material-id',
      isCustomizable: true,
    });
    materialRepository.findCustomizableUploadContext.mockResolvedValue({
      templateId: 'template-id',
      revision: 4,
      document,
      printPresetId: null,
      files: customizableFiles,
      activePrintExportCount: 0,
    });
    materialRepository.deleteCustomizableFile.mockResolvedValue(undefined);
  }

  it('remove a imagem do meio sem renumerar e recalcula os assets', async () => {
    materialRepository.findFileById.mockResolvedValue(
      makeMaterialFile({
        id: 'file-2',
        fileKey: 'materials/material-id/meio.png',
        sortOrder: 2,
      }),
    );
    mockCustomizable();

    await useCase.execute('material-id', 'file-2', 'org-id', 'user-id');

    expect(materialRepository.deleteFile).not.toHaveBeenCalled();
    expect(materialRepository.deleteCustomizableFile).toHaveBeenCalledWith(
      'material-id',
      'file-2',
      'org-id',
      {
        templateId: 'template-id',
        revision: 4,
        existingFileIds: ['file-1', 'file-2', 'file-3'],
        assetIds: ['library-asset-1', 'library-asset-2'],
        document: {
          version: 3,
          pages: [v3Document.pages[0], v3Document.pages[2]],
        },
      },
      'user-id',
    );
    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'materials/material-id/meio.png',
    ]);
  });

  it('remove a primeira imagem e descarta a página que era a âncora', async () => {
    materialRepository.findFileById.mockResolvedValue(
      makeMaterialFile({
        id: 'file-1',
        fileKey: 'materials/material-id/frente.png',
        sortOrder: 0,
      }),
    );
    mockCustomizable();

    await useCase.execute('material-id', 'file-1', 'org-id', 'user-id');

    expect(materialRepository.deleteCustomizableFile).toHaveBeenCalledWith(
      'material-id',
      'file-1',
      'org-id',
      expect.objectContaining({
        assetIds: ['library-asset-2'],
        document: {
          version: 3,
          pages: [v3Document.pages[1], v3Document.pages[2]],
        },
      }),
      'user-id',
    );
    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'materials/material-id/frente.png',
    ]);
  });

  it('falha ao excluir a única imagem e não apaga o objeto', async () => {
    findMaterialByIdUseCase.execute.mockResolvedValue({
      id: 'material-id',
      isCustomizable: true,
    });
    materialRepository.findFileById.mockResolvedValue(
      makeMaterialFile({
        id: 'file-1',
        fileKey: 'materials/material-id/unica.png',
      }),
    );
    materialRepository.findCustomizableUploadContext.mockResolvedValue({
      templateId: 'template-id',
      revision: 1,
      document: null,
      printPresetId: null,
      files: [{ id: 'file-1', width: 100, height: 80, sortOrder: 0 }],
      activePrintExportCount: 0,
    });

    await expect(
      useCase.execute('material-id', 'file-1', 'org-id', 'user-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(materialRepository.deleteCustomizableFile).not.toHaveBeenCalled();
    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });

  it('recusa exclusão quando há exportação de impressão em andamento', async () => {
    findMaterialByIdUseCase.execute.mockResolvedValue({
      id: 'material-id',
      isCustomizable: true,
    });
    materialRepository.findFileById.mockResolvedValue(
      makeMaterialFile({ id: 'file-2' }),
    );
    materialRepository.findCustomizableUploadContext.mockResolvedValue({
      templateId: 'template-id',
      revision: 1,
      document: v3Document,
      printPresetId: null,
      files: customizableFiles,
      activePrintExportCount: 1,
    });

    await expect(
      useCase.execute('material-id', 'file-2', 'org-id', 'user-id'),
    ).rejects.toThrow(
      'Não é possível excluir imagens enquanto houver uma exportação de impressão em andamento',
    );
    expect(materialRepository.deleteCustomizableFile).not.toHaveBeenCalled();
    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });

  it('não apaga o objeto quando a transação falha', async () => {
    materialRepository.findFileById.mockResolvedValue(
      makeMaterialFile({
        id: 'file-2',
        fileKey: 'materials/material-id/meio.png',
      }),
    );
    mockCustomizable();
    materialRepository.deleteCustomizableFile.mockRejectedValue(
      new Error('db'),
    );

    await expect(
      useCase.execute('material-id', 'file-2', 'org-id', 'user-id'),
    ).rejects.toThrow('db');
    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });
});
