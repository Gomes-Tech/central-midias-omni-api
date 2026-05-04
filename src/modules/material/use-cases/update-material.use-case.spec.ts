import { BadRequestException } from '@common/filters';
import { FindCategoryByIdUseCase } from '@modules/category';
import { MaterialRepository } from '../repository';
import { UpdateMaterialUseCase } from './update-material.use-case';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';
import {
  makeMaterialDetails,
  makeUpdateMaterialDTO,
} from './test-helpers';

describe('UpdateMaterialUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let findMaterialByIdUseCase: { execute: jest.Mock };
  let findCategoryByIdUseCase: { execute: jest.Mock };
  let useCase: UpdateMaterialUseCase;

  beforeEach(() => {
    materialRepository = {
      findByName: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;

    findMaterialByIdUseCase = { execute: jest.fn() };
    findCategoryByIdUseCase = { execute: jest.fn() };

    useCase = new UpdateMaterialUseCase(
      materialRepository,
      findMaterialByIdUseCase as unknown as FindMaterialByIdUseCase,
      findCategoryByIdUseCase as unknown as FindCategoryByIdUseCase,
    );
  });

  it('deve atualizar sem validar categoria nova quando ela não mudou', async () => {
    const material = makeMaterialDetails();
    const dto = makeUpdateMaterialDTO({ description: 'Novo texto' });

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    materialRepository.update.mockResolvedValue(undefined);

    await expect(
      useCase.execute(material.id, 'org-id', dto, 'user-id'),
    ).resolves.toBe(undefined);

    expect(findCategoryByIdUseCase.execute).not.toHaveBeenCalled();
    expect(materialRepository.findByName).not.toHaveBeenCalled();
    expect(materialRepository.update).toHaveBeenCalledWith(
      material.id,
      'org-id',
      dto,
      'user-id',
    );
  });

  it('deve validar categoria e nome quando houver mudança de escopo', async () => {
    const material = makeMaterialDetails();
    const dto = makeUpdateMaterialDTO({
      name: 'Novo nome',
      categoryId: 'other-category',
    });

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
    materialRepository.update.mockResolvedValue(undefined);

    await useCase.execute(material.id, 'org-id', dto, 'user-id');

    expect(findCategoryByIdUseCase.execute).toHaveBeenCalledWith(
      dto.categoryId,
      'org-id',
    );
    expect(materialRepository.findByName).toHaveBeenCalledWith(
      'Novo nome',
      'other-category',
    );
  });

  it('deve impedir mover para categoria inativa', async () => {
    const material = makeMaterialDetails();
    const dto = makeUpdateMaterialDTO({ categoryId: 'other-category' });

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: false,
    });

    await expect(
      useCase.execute(material.id, 'org-id', dto, 'user-id'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      useCase.execute(material.id, 'org-id', dto, 'user-id'),
    ).rejects.toThrow('Categoria informada está inativa');
  });

  it('deve impedir duplicidade de nome na categoria alvo', async () => {
    const material = makeMaterialDetails();
    const dto = makeUpdateMaterialDTO({ name: 'Duplicado' });

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    materialRepository.findByName.mockResolvedValue({
      id: 'another-material',
      name: 'Duplicado',
      categoryId: material.categoryId,
    });

    await expect(
      useCase.execute(material.id, 'org-id', dto, 'user-id'),
    ).rejects.toThrow('Já existe um material com este nome nesta categoria');
  });
});
