import { ForbiddenException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { MaterialRepository } from '../repository';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';
import { makeMaterialDetails, makeMaterialFile } from './test-helpers';
import { ViewMaterialFilesUseCase } from './view-material-files.use-case';

describe('ViewMaterialFilesUseCase', () => {
  let materialRepository: jest.Mocked<
    Pick<MaterialRepository, 'userHasCategoryAccess' | 'findFilesByMaterialId'>
  >;
  let findMaterialByIdUseCase: { execute: jest.Mock };
  let storageService: jest.Mocked<Pick<StorageService, 'getPublicUrl'>>;
  let useCase: ViewMaterialFilesUseCase;

  beforeEach(() => {
    materialRepository = {
      userHasCategoryAccess: jest.fn(),
      findFilesByMaterialId: jest.fn(),
    };
    findMaterialByIdUseCase = { execute: jest.fn() };
    storageService = {
      getPublicUrl: jest.fn(),
    };

    useCase = new ViewMaterialFilesUseCase(
      findMaterialByIdUseCase as unknown as FindMaterialByIdUseCase,
      materialRepository as unknown as MaterialRepository,
      storageService as unknown as StorageService,
    );
  });

  it('deve retornar arquivos com URL pública quando usuário tiver acesso', async () => {
    const material = makeMaterialDetails();

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    materialRepository.userHasCategoryAccess.mockResolvedValue(true);
    materialRepository.findFilesByMaterialId.mockResolvedValue([
      makeMaterialFile({ fileKey: 'materials/material-id/file.pdf' }),
    ]);
    storageService.getPublicUrl.mockResolvedValue('https://cdn.test/file.pdf');

    await expect(
      useCase.execute('material-id', 'org-id', 'user-id'),
    ).resolves.toEqual([
      {
        id: 'material-file-id',
        materialId: 'material-id',
        originalName: 'arquivo.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        width: null,
        height: null,
        sortOrder: 0,
        url: 'https://cdn.test/file.pdf',
      },
    ]);

    expect(findMaterialByIdUseCase.execute).toHaveBeenCalledWith(
      'material-id',
      'org-id',
      'user-id',
    );
    expect(materialRepository.userHasCategoryAccess).toHaveBeenCalledWith(
      'org-id',
      material.categoryId,
      'user-id',
    );
    expect(storageService.getPublicUrl).toHaveBeenCalledWith(
      'materials/material-id/file.pdf',
    );
  });

  it('deve lançar ForbiddenException quando usuário não tiver acesso', async () => {
    findMaterialByIdUseCase.execute.mockResolvedValue(makeMaterialDetails());
    materialRepository.userHasCategoryAccess.mockResolvedValue(false);

    await expect(
      useCase.execute('material-id', 'org-id', 'user-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(materialRepository.findFilesByMaterialId).not.toHaveBeenCalled();
  });
});
