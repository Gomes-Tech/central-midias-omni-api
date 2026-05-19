import { StorageService } from '@infrastructure/providers';
import { MaterialRepository } from '../repository';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';
import { FindMaterialFilesUseCase } from './find-material-files.use-case';
import { makeMaterialFile } from './test-helpers';

describe('FindMaterialFilesUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let findMaterialByIdUseCase: { execute: jest.Mock };
  let storageService: jest.Mocked<Pick<StorageService, 'getPublicUrl'>>;
  let useCase: FindMaterialFilesUseCase;

  beforeEach(() => {
    materialRepository = {
      findFilesByMaterialId: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;
    findMaterialByIdUseCase = { execute: jest.fn() };
    storageService = {
      getPublicUrl: jest.fn(),
    };

    useCase = new FindMaterialFilesUseCase(
      materialRepository,
      findMaterialByIdUseCase as unknown as FindMaterialByIdUseCase,
      storageService as unknown as StorageService,
    );
  });

  it('deve retornar arquivos com URL assinada sem expor fileKey', async () => {
    materialRepository.findFilesByMaterialId.mockResolvedValue([
      makeMaterialFile({ fileKey: 'materials/material-id/file.pdf' }),
    ]);
    findMaterialByIdUseCase.execute.mockResolvedValue({ id: 'material-id' });
    storageService.getPublicUrl.mockResolvedValue('https://cdn.test/file.pdf');

    await expect(useCase.execute('material-id', 'org-id')).resolves.toEqual([
      {
        id: 'material-file-id',
        materialId: 'material-id',
        mimeType: 'application/pdf',
        size: 1024,
        url: 'https://cdn.test/file.pdf',
      },
    ]);

    expect(findMaterialByIdUseCase.execute).toHaveBeenCalledWith(
      'material-id',
      'org-id',
    );
    expect(storageService.getPublicUrl).toHaveBeenCalledWith(
      'materials/material-id/file.pdf',
    );
  });
});
