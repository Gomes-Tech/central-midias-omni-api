import { NotFoundException } from '@common/filters';
import { CategoryRepository } from '../repository';
import { FindCategoryByIdUseCase } from './find-category-by-id.use-case';
import { makeCategoryDetails, makeUpdateCategoryDTO } from './test-helpers';
import { UpdateCategoryUseCase } from './update-category.use-case';

describe('UpdateCategoryUseCase', () => {
  let categoryRepository: jest.Mocked<
    Pick<
      CategoryRepository,
      'findBySlug' | 'findByOrder' | 'findHierarchyReferences' | 'update'
    >
  >;
  let findCategoryByIdUseCase: jest.Mocked<
    Pick<FindCategoryByIdUseCase, 'execute'>
  >;
  let useCase: UpdateCategoryUseCase;

  beforeEach(() => {
    categoryRepository = {
      findBySlug: jest.fn(),
      findByOrder: jest.fn(),
      findHierarchyReferences: jest.fn(),
      update: jest.fn(),
    };

    findCategoryByIdUseCase = {
      execute: jest.fn(),
    };

    useCase = new UpdateCategoryUseCase(
      categoryRepository as unknown as CategoryRepository,
      findCategoryByIdUseCase as unknown as FindCategoryByIdUseCase,
    );
  });

  it('deve atualizar quando não houver conflitos', async () => {
    const category = makeCategoryDetails({ id: 'cat-1', slug: 'a', order: 0 });
    const data = makeUpdateCategoryDTO({ name: 'Novo nome' });

    findCategoryByIdUseCase.execute.mockResolvedValue(category);
    categoryRepository.update.mockResolvedValue();

    await expect(
      useCase.execute('cat-1', 'org-id', data, 'user-id'),
    ).resolves.toBeUndefined();

    expect(categoryRepository.findBySlug).not.toHaveBeenCalled();
    expect(categoryRepository.update).toHaveBeenCalledWith(
      'cat-1',
      'org-id',
      data,
      'user-id',
    );
  });

  it('deve lançar BadRequest quando o novo slug já existir em outra categoria', async () => {
    const category = makeCategoryDetails({ id: 'cat-1', slug: 'a' });
    const data = makeUpdateCategoryDTO({ slug: 'b' });

    findCategoryByIdUseCase.execute.mockResolvedValue(category);
    categoryRepository.findBySlug.mockResolvedValue({
      id: 'outra',
      slug: 'b',
    });

    await expect(
      useCase.execute('cat-1', 'org-id', data, 'user-id'),
    ).rejects.toThrow('Já existe uma categoria com este slug');

    expect(categoryRepository.update).not.toHaveBeenCalled();
  });

  it('deve permitir manter o mesmo slug', async () => {
    const category = makeCategoryDetails({ id: 'cat-1', slug: 'x' });
    const data = makeUpdateCategoryDTO({ slug: 'x' });

    findCategoryByIdUseCase.execute.mockResolvedValue(category);
    categoryRepository.update.mockResolvedValue();

    await expect(
      useCase.execute('cat-1', 'org-id', data, 'user-id'),
    ).resolves.toBeUndefined();

    expect(categoryRepository.findBySlug).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando a nova ordem já existir em outra categoria', async () => {
    const category = makeCategoryDetails({ id: 'cat-1', order: 0 });
    const data = makeUpdateCategoryDTO({ order: 5 });

    findCategoryByIdUseCase.execute.mockResolvedValue(category);
    categoryRepository.findByOrder.mockResolvedValue({
      id: 'outra',
      order: 5,
    });

    await expect(
      useCase.execute('cat-1', 'org-id', data, 'user-id'),
    ).rejects.toThrow(
      'Já existe uma categoria com esta ordem nesta organização',
    );

    expect(categoryRepository.update).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando parentId for o próprio id', async () => {
    const category = makeCategoryDetails({ id: 'cat-1' });
    const data = makeUpdateCategoryDTO({ parentId: 'cat-1' });

    findCategoryByIdUseCase.execute.mockResolvedValue(category);

    await expect(
      useCase.execute('cat-1', 'org-id', data, 'user-id'),
    ).rejects.toThrow('Uma categoria não pode ser pai dela mesma');

    expect(categoryRepository.update).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando o novo pai gerar ciclo na hierarquia', async () => {
    const category = makeCategoryDetails({ id: 'a' });
    const data = makeUpdateCategoryDTO({ parentId: 'b' });

    findCategoryByIdUseCase.execute
      .mockResolvedValueOnce(category)
      .mockResolvedValueOnce(
        makeCategoryDetails({ id: 'b', slug: 'b', name: 'B' }),
      );

    categoryRepository.findHierarchyReferences.mockResolvedValue([
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'c' },
      { id: 'c', parentId: 'a' },
    ]);

    await expect(
      useCase.execute('a', 'org-id', data, 'user-id'),
    ).rejects.toThrow(
      'Não é possível criar um ciclo na hierarquia de categorias',
    );

    expect(categoryRepository.update).not.toHaveBeenCalled();
  });

  it('deve atualizar quando parentId for válido', async () => {
    const category = makeCategoryDetails({ id: 'child' });
    const data = makeUpdateCategoryDTO({ parentId: 'parent-id' });

    findCategoryByIdUseCase.execute
      .mockResolvedValueOnce(category)
      .mockResolvedValueOnce(
        makeCategoryDetails({ id: 'parent-id', slug: 'p' }),
      );
    categoryRepository.findHierarchyReferences.mockResolvedValue([
      { id: 'child', parentId: null },
      { id: 'parent-id', parentId: null },
    ]);
    categoryRepository.update.mockResolvedValue();

    await expect(
      useCase.execute('child', 'org-id', data, 'user-id'),
    ).resolves.toBeUndefined();

    expect(categoryRepository.update).toHaveBeenCalled();
  });

  it('deve propagar NotFound quando a categoria não existir', async () => {
    findCategoryByIdUseCase.execute.mockRejectedValue(
      new NotFoundException('Categoria não encontrada'),
    );

    await expect(
      useCase.execute('missing', 'org-id', makeUpdateCategoryDTO(), 'user-id'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(categoryRepository.update).not.toHaveBeenCalled();
  });
});
