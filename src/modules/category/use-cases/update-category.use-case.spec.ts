import { NotFoundException } from '@common/filters';
import { CategoryRepository } from '../repository';
import { FindCategoryByIdUseCase } from './find-category-by-id.use-case';
import { makeCategoryDetails, makeUpdateCategoryDTO } from './test-helpers';
import { UpdateCategoryUseCase } from './update-category.use-case';

describe('UpdateCategoryUseCase', () => {
  let categoryRepository: jest.Mocked<
    Pick<
      CategoryRepository,
      | 'findSiblingBySlug'
      | 'findSiblingByOrder'
      | 'findHierarchyReferences'
      | 'update'
    >
  >;
  let findCategoryByIdUseCase: jest.Mocked<
    Pick<FindCategoryByIdUseCase, 'execute'>
  >;
  let useCase: UpdateCategoryUseCase;

  beforeEach(() => {
    categoryRepository = {
      findSiblingBySlug: jest.fn(),
      findSiblingByOrder: jest.fn(),
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

    expect(categoryRepository.findSiblingBySlug).not.toHaveBeenCalled();
    expect(categoryRepository.update).toHaveBeenCalledWith(
      'cat-1',
      'org-id',
      data,
      'user-id',
    );
  });

  it('deve lançar BadRequest quando o novo slug já existir entre irmãos', async () => {
    const category = makeCategoryDetails({ id: 'cat-1', slug: 'a' });
    const data = makeUpdateCategoryDTO({ slug: 'b' });

    findCategoryByIdUseCase.execute.mockResolvedValue(category);
    categoryRepository.findSiblingBySlug.mockResolvedValue({
      id: 'outra',
      slug: 'b',
    });

    await expect(
      useCase.execute('cat-1', 'org-id', data, 'user-id'),
    ).rejects.toThrow('Já existe uma categoria com este slug neste nível');

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

    expect(categoryRepository.findSiblingBySlug).not.toHaveBeenCalled();
  });

  it('deve recalcular slugPath ao renomear slug', async () => {
    const category = makeCategoryDetails({
      id: 'cat-1',
      slug: 'a',
      slugPath: 'a',
    });
    const data = makeUpdateCategoryDTO({ slug: 'b' });

    findCategoryByIdUseCase.execute.mockResolvedValue(category);
    categoryRepository.findSiblingBySlug.mockResolvedValue(null);
    categoryRepository.update.mockResolvedValue();

    await useCase.execute('cat-1', 'org-id', data, 'user-id');

    expect(categoryRepository.update).toHaveBeenCalledWith(
      'cat-1',
      'org-id',
      { ...data, slugPath: 'b' },
      'user-id',
    );
  });

  it('deve recalcular slugPath ao mover para outro pai', async () => {
    const category = makeCategoryDetails({
      id: 'child',
      slug: 'filho',
      slugPath: 'pai-a/filho',
      parentId: 'pai-a',
    });
    const data = makeUpdateCategoryDTO({ parentId: 'pai-b' });

    findCategoryByIdUseCase.execute
      .mockResolvedValueOnce(category)
      .mockResolvedValueOnce(
        makeCategoryDetails({
          id: 'pai-b',
          slug: 'pai-b',
          slugPath: 'pai-b',
        }),
      )
      .mockResolvedValueOnce(
        makeCategoryDetails({
          id: 'pai-b',
          slug: 'pai-b',
          slugPath: 'pai-b',
        }),
      );
    categoryRepository.findHierarchyReferences.mockResolvedValue([
      { id: 'child', parentId: 'pai-a' },
      { id: 'pai-b', parentId: null },
    ]);
    categoryRepository.findSiblingBySlug.mockResolvedValue(null);
    categoryRepository.update.mockResolvedValue();

    await useCase.execute('child', 'org-id', data, 'user-id');

    expect(categoryRepository.update).toHaveBeenCalledWith(
      'child',
      'org-id',
      { ...data, slugPath: 'pai-b/filho' },
      'user-id',
    );
  });

  it('deve lançar BadRequest quando a nova ordem já existir em outra categoria', async () => {
    const category = makeCategoryDetails({ id: 'cat-1', order: 0 });
    const data = makeUpdateCategoryDTO({ order: 5 });

    findCategoryByIdUseCase.execute.mockResolvedValue(category);
    categoryRepository.findSiblingByOrder.mockResolvedValue({
      id: 'outra',
      order: 5,
    });

    await expect(
      useCase.execute('cat-1', 'org-id', data, 'user-id'),
    ).rejects.toThrow(
      'Já existe uma categoria com esta ordem neste nível',
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
        makeCategoryDetails({
          id: 'parent-id',
          slug: 'p',
          slugPath: 'p',
        }),
      )
      .mockResolvedValueOnce(
        makeCategoryDetails({
          id: 'parent-id',
          slug: 'p',
          slugPath: 'p',
        }),
      );
    categoryRepository.findHierarchyReferences.mockResolvedValue([
      { id: 'child', parentId: null },
      { id: 'parent-id', parentId: null },
    ]);
    categoryRepository.findSiblingBySlug.mockResolvedValue(null);
    categoryRepository.update.mockResolvedValue();

    await expect(
      useCase.execute('child', 'org-id', data, 'user-id'),
    ).resolves.toBeUndefined();

    expect(categoryRepository.update).toHaveBeenCalled();
  });

  it('deve validar ordem no novo nível quando o pai mudar', async () => {
    const category = makeCategoryDetails({
      id: 'child',
      order: 0,
      parentId: 'old-parent',
    });
    const data = makeUpdateCategoryDTO({ parentId: 'new-parent' });

    findCategoryByIdUseCase.execute
      .mockResolvedValueOnce(category)
      .mockResolvedValueOnce(
        makeCategoryDetails({ id: 'new-parent', slug: 'p' }),
      );
    categoryRepository.findHierarchyReferences.mockResolvedValue([
      { id: 'child', parentId: 'old-parent' },
      { id: 'new-parent', parentId: null },
    ]);
    categoryRepository.findSiblingByOrder.mockResolvedValue({
      id: 'sibling',
      order: 0,
    });

    await expect(
      useCase.execute('child', 'org-id', data, 'user-id'),
    ).rejects.toThrow(
      'Já existe uma categoria com esta ordem neste nível',
    );

    expect(categoryRepository.findSiblingByOrder).toHaveBeenCalledWith(
      0,
      'org-id',
      'new-parent',
      'child',
    );
    expect(categoryRepository.update).not.toHaveBeenCalled();
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
