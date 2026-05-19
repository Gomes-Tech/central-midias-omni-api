import { NotFoundException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
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
    } as unknown as jest.Mocked<MaterialRepository>;
    findMaterialByIdUseCase = { execute: jest.fn() };
    storageService = {
      deleteFile: jest.fn(),
    };

    useCase = new DeleteMaterialFileUseCase(
      materialRepository,
      findMaterialByIdUseCase as unknown as FindMaterialByIdUseCase,
      storageService as unknown as StorageService,
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
});
