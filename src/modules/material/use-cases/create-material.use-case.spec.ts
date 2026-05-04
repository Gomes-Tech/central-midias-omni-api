import { BadRequestException } from '@common/filters';
import { FindCategoryByIdUseCase } from '@modules/category';
import { MaterialRepository } from '../repository';
import { CreateMaterialUseCase } from './create-material.use-case';
import { makeCreateMaterialDTO } from './test-helpers';

describe('CreateMaterialUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let findCategoryByIdUseCase: { execute: jest.Mock };
  let useCase: CreateMaterialUseCase;

  beforeEach(() => {
    materialRepository = {
      findByName: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;

    findCategoryByIdUseCase = { execute: jest.fn() };

    useCase = new CreateMaterialUseCase(
      materialRepository,
      findCategoryByIdUseCase as unknown as FindCategoryByIdUseCase,
    );
  });

  it('deve criar um material quando categoria estiver ativa e nome livre', async () => {
    const dto = makeCreateMaterialDTO();
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
    materialRepository.create.mockResolvedValue(undefined);

    await expect(useCase.execute('org-id', dto, 'user-id')).resolves.toBe(
      undefined,
    );

    expect(findCategoryByIdUseCase.execute).toHaveBeenCalledWith(
      dto.categoryId,
      'org-id',
    );
    expect(materialRepository.findByName).toHaveBeenCalledWith(
      dto.name,
      dto.categoryId,
    );
    expect(materialRepository.create).toHaveBeenCalledWith(
      'org-id',
      dto,
      'user-id',
    );
  });

  it('deve impedir criação em categoria inativa', async () => {
    const dto = makeCreateMaterialDTO();
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: false,
    });

    await expect(useCase.execute('org-id', dto, 'user-id')).rejects.toThrow(
      BadRequestException,
    );
    await expect(useCase.execute('org-id', dto, 'user-id')).rejects.toThrow(
      'Categoria informada está inativa',
    );
  });

  it('deve impedir nome duplicado na mesma categoria', async () => {
    const dto = makeCreateMaterialDTO();
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue({
      id: 'existing',
      name: dto.name,
      categoryId: dto.categoryId,
    });

    await expect(useCase.execute('org-id', dto, 'user-id')).rejects.toThrow(
      'Já existe um material com este nome nesta categoria',
    );
  });
});
