import { MaterialRepository } from '../repository';
import { DeleteMaterialUseCase } from './delete-material.use-case';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';

describe('DeleteMaterialUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let findMaterialByIdUseCase: { execute: jest.Mock };
  let useCase: DeleteMaterialUseCase;

  beforeEach(() => {
    materialRepository = {
      delete: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;

    findMaterialByIdUseCase = { execute: jest.fn() };

    useCase = new DeleteMaterialUseCase(
      materialRepository,
      findMaterialByIdUseCase as unknown as FindMaterialByIdUseCase,
    );
  });

  it('deve buscar antes de remover', async () => {
    findMaterialByIdUseCase.execute.mockResolvedValue({ id: 'material-id' });
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
  });
});
