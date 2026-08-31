import { BadRequestException, NotFoundException } from '@common/filters';
import { CategoryRepository } from '../repository';
import { DeleteCategoryUseCase } from './delete-category.use-case';
import { FindCategoryByIdUseCase } from './find-category-by-id.use-case';
import { makeCategoryDetails } from './test-helpers';

describe('DeleteCategoryUseCase', () => {
  let categoryRepository: jest.Mocked<
    Pick<CategoryRepository, 'delete' | 'countMaterials'>
  >;
  let findCategoryByIdUseCase: jest.Mocked<
    Pick<FindCategoryByIdUseCase, 'execute'>
  >;
  let useCase: DeleteCategoryUseCase;

  beforeEach(() => {
    categoryRepository = {
      delete: jest.fn(),
      countMaterials: jest.fn(),
    };

    findCategoryByIdUseCase = {
      execute: jest.fn(),
    };

    useCase = new DeleteCategoryUseCase(
      categoryRepository as unknown as CategoryRepository,
      findCategoryByIdUseCase as unknown as FindCategoryByIdUseCase,
    );
  });

  it('deve excluir direto uma categoria raiz sem materiais', async () => {
    const category = makeCategoryDetails({ id: 'cat-1', parentId: null });

    findCategoryByIdUseCase.execute.mockResolvedValue(category);
    categoryRepository.countMaterials.mockResolvedValue(0);
    categoryRepository.delete.mockResolvedValue();

    await expect(
      useCase.execute('cat-1', 'org-id', 'user-id', 'transfer-id'),
    ).resolves.toBeUndefined();

    expect(findCategoryByIdUseCase.execute).toHaveBeenCalledTimes(1);
    expect(findCategoryByIdUseCase.execute).toHaveBeenCalledWith(
      'cat-1',
      'org-id',
    );
    expect(categoryRepository.countMaterials).toHaveBeenCalledWith('cat-1');
    expect(categoryRepository.delete).toHaveBeenCalledWith(
      'cat-1',
      'org-id',
      'user-id',
      undefined,
    );
  });

  it('deve excluir direto uma categoria filha sem materiais', async () => {
    const category = makeCategoryDetails({
      id: 'child-1',
      parentId: 'parent-1',
    });

    findCategoryByIdUseCase.execute.mockResolvedValue(category);
    categoryRepository.countMaterials.mockResolvedValue(0);
    categoryRepository.delete.mockResolvedValue();

    await expect(
      useCase.execute('child-1', 'org-id', 'user-id'),
    ).resolves.toBeUndefined();

    expect(categoryRepository.delete).toHaveBeenCalledWith(
      'child-1',
      'org-id',
      'user-id',
      undefined,
    );
  });

  it('deve transferir materiais da categoria filha para o pai e excluir', async () => {
    const category = makeCategoryDetails({
      id: 'child-1',
      parentId: 'parent-1',
    });

    findCategoryByIdUseCase.execute.mockResolvedValue(category);
    categoryRepository.countMaterials.mockResolvedValue(3);
    categoryRepository.delete.mockResolvedValue();

    await expect(
      useCase.execute('child-1', 'org-id', 'user-id', 'ignored-transfer'),
    ).resolves.toBeUndefined();

    expect(findCategoryByIdUseCase.execute).toHaveBeenCalledTimes(1);
    expect(categoryRepository.delete).toHaveBeenCalledWith(
      'child-1',
      'org-id',
      'user-id',
      'parent-1',
    );
  });

  it('deve transferir materiais da categoria raiz para transferCategoryId e excluir', async () => {
    const category = makeCategoryDetails({ id: 'cat-1', parentId: null });
    const destination = makeCategoryDetails({ id: 'dest-1' });

    findCategoryByIdUseCase.execute
      .mockResolvedValueOnce(category)
      .mockResolvedValueOnce(destination);
    categoryRepository.countMaterials.mockResolvedValue(2);
    categoryRepository.delete.mockResolvedValue();

    await expect(
      useCase.execute('cat-1', 'org-id', 'user-id', 'dest-1'),
    ).resolves.toBeUndefined();

    expect(findCategoryByIdUseCase.execute).toHaveBeenNthCalledWith(
      2,
      'dest-1',
      'org-id',
    );
    expect(categoryRepository.delete).toHaveBeenCalledWith(
      'cat-1',
      'org-id',
      'user-id',
      'dest-1',
    );
  });

  it('deve rejeitar exclusão de categoria de nível 0 com materiais sem transferCategoryId', async () => {
    const category = makeCategoryDetails({ id: 'cat-1', parentId: null });

    findCategoryByIdUseCase.execute.mockResolvedValue(category);
    categoryRepository.countMaterials.mockResolvedValue(1);

    await expect(
      useCase.execute('cat-1', 'org-id', 'user-id'),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(useCase.execute('cat-1', 'org-id', 'user-id')).rejects.toThrow(
      'Esta categoria possui materiais vinculados. Realoque esses materiais para outra categoria antes de excluí-la.',
    );

    expect(categoryRepository.delete).not.toHaveBeenCalled();
  });

  it('deve propagar NotFound quando a categoria de destino não existir', async () => {
    const category = makeCategoryDetails({ id: 'cat-1', parentId: null });

    findCategoryByIdUseCase.execute
      .mockResolvedValueOnce(category)
      .mockRejectedValueOnce(new NotFoundException('Categoria não encontrada'));
    categoryRepository.countMaterials.mockResolvedValue(1);

    await expect(
      useCase.execute('cat-1', 'org-id', 'user-id', 'missing-dest'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(categoryRepository.delete).not.toHaveBeenCalled();
  });

  it('deve rejeitar transferCategoryId igual à categoria excluída', async () => {
    const category = makeCategoryDetails({ id: 'cat-1', parentId: null });

    findCategoryByIdUseCase.execute.mockResolvedValue(category);
    categoryRepository.countMaterials.mockResolvedValue(1);

    await expect(
      useCase.execute('cat-1', 'org-id', 'user-id', 'cat-1'),
    ).rejects.toThrow(
      'A categoria de destino não pode ser a mesma que está sendo excluída',
    );

    expect(categoryRepository.delete).not.toHaveBeenCalled();
  });

  it('deve rejeitar exclusão quando a categoria possui subcategorias', async () => {
    const category = makeCategoryDetails({
      id: 'cat-1',
      children: [
        {
          id: 'child-1',
          name: 'Filha',
          slug: 'filha',
          slugPath: 'cat-1/filha',
          isActive: true,
          order: 0,
        },
      ],
    });

    findCategoryByIdUseCase.execute.mockResolvedValue(category);

    await expect(useCase.execute('cat-1', 'org-id', 'user-id')).rejects.toThrow(
      'Não é possível excluir uma categoria que possui subcategorias',
    );

    expect(categoryRepository.countMaterials).not.toHaveBeenCalled();
    expect(categoryRepository.delete).not.toHaveBeenCalled();
  });

  it('deve propagar NotFound quando a categoria não existir', async () => {
    findCategoryByIdUseCase.execute.mockRejectedValue(
      new NotFoundException('Categoria não encontrada'),
    );

    await expect(
      useCase.execute('missing', 'org-id', 'user-id'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(categoryRepository.countMaterials).not.toHaveBeenCalled();
    expect(categoryRepository.delete).not.toHaveBeenCalled();
  });
});
