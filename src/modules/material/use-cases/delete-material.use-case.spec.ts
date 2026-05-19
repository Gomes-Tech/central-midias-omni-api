import { StorageService } from '@infrastructure/providers';
import { MaterialRepository } from '../repository';
import { DeleteMaterialUseCase } from './delete-material.use-case';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';
import { makeMaterialFile } from './test-helpers';

describe('DeleteMaterialUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let findMaterialByIdUseCase: { execute: jest.Mock };
  let storageService: { deleteFile: jest.Mock };
  let useCase: DeleteMaterialUseCase;

  beforeEach(() => {
    materialRepository = {
      delete: jest.fn(),
      findFilesByMaterialId: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;

    findMaterialByIdUseCase = { execute: jest.fn() };
    storageService = { deleteFile: jest.fn() };

    useCase = new DeleteMaterialUseCase(
      materialRepository,
      findMaterialByIdUseCase as unknown as FindMaterialByIdUseCase,
      storageService as unknown as StorageService,
    );
  });

  it('deve buscar antes de remover', async () => {
    findMaterialByIdUseCase.execute.mockResolvedValue({ id: 'material-id' });
    materialRepository.findFilesByMaterialId.mockResolvedValue([]);
    materialRepository.delete.mockResolvedValue(undefined);

    await expect(
      useCase.execute('material-id', 'org-id', 'user-id'),
    ).resolves.toBe(undefined);

    expect(findMaterialByIdUseCase.execute).toHaveBeenCalledWith(
      'material-id',
      'org-id',
    );
    expect(materialRepository.delete).toHaveBeenCalledWith(
      'material-id',
      'org-id',
      'user-id',
    );
    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });

  it('deve remover arquivos da AWS após soft delete quando existirem', async () => {
    findMaterialByIdUseCase.execute.mockResolvedValue({ id: 'material-id' });
    materialRepository.findFilesByMaterialId.mockResolvedValue([
      makeMaterialFile({ fileKey: 'materials/material-id/a.pdf' }),
      makeMaterialFile({
        id: 'file-2',
        fileKey: 'materials/material-id/b.png',
      }),
    ]);
    materialRepository.delete.mockResolvedValue(undefined);

    await useCase.execute('material-id', 'org-id', 'user-id');

    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'materials/material-id/a.pdf',
      'materials/material-id/b.png',
    ]);
  });
});
