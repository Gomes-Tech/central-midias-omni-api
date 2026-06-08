import { BadRequestException, NotFoundException } from '@common/filters';
import { SyncCategoryGlobalRolesUseCase } from '@modules/category-role-access/use-cases/sync-category-global-roles.use-case';
import { CategoryRepository } from '../repository';
import { CreateCategoryUseCase } from './create-category.use-case';
import { FindCategoryByIdUseCase } from './find-category-by-id.use-case';
import { makeCategoryDetails, makeCreateCategoryDTO } from './test-helpers';

describe('CreateCategoryUseCase', () => {
  let categoryRepository: jest.Mocked<
    Pick<CategoryRepository, 'findSiblingBySlug' | 'findSiblingByOrder' | 'create'>
  >;
  let findCategoryByIdUseCase: jest.Mocked<Pick<FindCategoryByIdUseCase, 'execute'>>;
  let syncCategoryGlobalRolesUseCase: jest.Mocked<
    Pick<SyncCategoryGlobalRolesUseCase, 'execute'>
  >;
  let useCase: CreateCategoryUseCase;

  beforeEach(() => {
    categoryRepository = {
      findSiblingBySlug: jest.fn(),
      findSiblingByOrder: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'category-1' }),
    };

    findCategoryByIdUseCase = {
      execute: jest.fn(),
    };

    syncCategoryGlobalRolesUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new CreateCategoryUseCase(
      categoryRepository as unknown as CategoryRepository,
      findCategoryByIdUseCase as unknown as FindCategoryByIdUseCase,
      syncCategoryGlobalRolesUseCase as unknown as SyncCategoryGlobalRolesUseCase,
    );
  });

  it('deve criar quando slug e ordem estiverem livres e não houver pai', async () => {
    const dto = makeCreateCategoryDTO();

    categoryRepository.findSiblingBySlug.mockResolvedValue(null);
    categoryRepository.findSiblingByOrder.mockResolvedValue(null);

    await expect(
      useCase.execute('org-id', dto, 'user-id'),
    ).resolves.toBeUndefined();

    expect(categoryRepository.create).toHaveBeenCalledWith(
      'org-id',
      { slug: 'categoria', slugPath: 'categoria', ...dto },
      'user-id',
    );
    expect(syncCategoryGlobalRolesUseCase.execute).toHaveBeenCalledWith(
      'category-1',
      'org-id',
    );
    expect(findCategoryByIdUseCase.execute).not.toHaveBeenCalled();
    expect(categoryRepository.findSiblingBySlug).toHaveBeenCalledWith(
      'categoria',
      'org-id',
      null,
    );
    expect(categoryRepository.findSiblingByOrder).toHaveBeenCalledWith(
      0,
      'org-id',
      null,
    );
  });

  it('deve permitir mesmo slug em pais diferentes', async () => {
    const dto = makeCreateCategoryDTO({
      name: 'Redes Sociais',
      parentId: 'marketing-id',
    });
    const parent = makeCategoryDetails({
      id: 'marketing-id',
      slug: 'marketing',
      slugPath: 'marketing',
      isActive: true,
    });

    categoryRepository.findSiblingBySlug.mockResolvedValue(null);
    categoryRepository.findSiblingByOrder.mockResolvedValue(null);
    findCategoryByIdUseCase.execute.mockResolvedValue(parent);

    await expect(
      useCase.execute('org-id', dto, 'user-id'),
    ).resolves.toBeUndefined();

    expect(categoryRepository.findSiblingBySlug).toHaveBeenCalledWith(
      'redes-sociais',
      'org-id',
      'marketing-id',
    );
    expect(categoryRepository.create).toHaveBeenCalledWith(
      'org-id',
      expect.objectContaining({
        slug: 'redes-sociais',
        slugPath: 'marketing/redes-sociais',
      }),
      'user-id',
    );
  });

  it('deve lançar BadRequest quando o slug já existir entre irmãos', async () => {
    const dto = makeCreateCategoryDTO({ name: 'dup' });

    categoryRepository.findSiblingBySlug.mockResolvedValue({
      id: 'existing-id',
      slug: 'dup',
    });

    const result = useCase.execute('org-id', dto, 'user-id');

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toThrow(
      'Já existe uma categoria com este slug neste nível',
    );

    expect(categoryRepository.create).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando a ordem já estiver em uso', async () => {
    const dto = makeCreateCategoryDTO({ order: 3 });

    categoryRepository.findSiblingBySlug.mockResolvedValue(null);
    categoryRepository.findSiblingByOrder.mockResolvedValue({
      id: 'other-id',
      order: 3,
    });

    await expect(useCase.execute('org-id', dto, 'user-id')).rejects.toThrow(
      'Já existe uma categoria com esta ordem neste nível',
    );

    expect(categoryRepository.create).not.toHaveBeenCalled();
  });

  it('deve criar com pai quando o pai estiver ativo', async () => {
    const dto = makeCreateCategoryDTO({ parentId: 'parent-id' });
    const parent = makeCategoryDetails({
      id: 'parent-id',
      slug: 'pai',
      slugPath: 'pai',
      isActive: true,
    });

    categoryRepository.findSiblingBySlug.mockResolvedValue(null);
    categoryRepository.findSiblingByOrder.mockResolvedValue(null);
    findCategoryByIdUseCase.execute.mockResolvedValue(parent);

    await expect(
      useCase.execute('org-id', dto, 'user-id'),
    ).resolves.toBeUndefined();

    expect(findCategoryByIdUseCase.execute).toHaveBeenCalledWith(
      'parent-id',
      'org-id',
    );
    expect(categoryRepository.findSiblingByOrder).toHaveBeenCalledWith(
      0,
      'org-id',
      'parent-id',
    );
    expect(categoryRepository.create).toHaveBeenCalledWith(
      'org-id',
      expect.objectContaining({ slugPath: 'pai/categoria' }),
      'user-id',
    );
  });

  it('deve lançar BadRequest quando a categoria pai estiver inativa', async () => {
    const dto = makeCreateCategoryDTO({ parentId: 'parent-id' });

    categoryRepository.findSiblingBySlug.mockResolvedValue(null);
    categoryRepository.findSiblingByOrder.mockResolvedValue(null);
    findCategoryByIdUseCase.execute.mockResolvedValue(
      makeCategoryDetails({ id: 'parent-id', isActive: false }),
    );

    await expect(useCase.execute('org-id', dto, 'user-id')).rejects.toThrow(
      'Categoria pai está inativa',
    );

    expect(categoryRepository.create).not.toHaveBeenCalled();
  });

  it('deve propagar NotFound quando o pai não existir', async () => {
    const dto = makeCreateCategoryDTO({ parentId: 'parent-id' });

    categoryRepository.findSiblingBySlug.mockResolvedValue(null);
    categoryRepository.findSiblingByOrder.mockResolvedValue(null);
    findCategoryByIdUseCase.execute.mockRejectedValue(
      new NotFoundException('Categoria não encontrada'),
    );

    await expect(useCase.execute('org-id', dto, 'user-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(categoryRepository.create).not.toHaveBeenCalled();
  });
});
