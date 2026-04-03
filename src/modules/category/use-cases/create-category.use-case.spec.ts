import { BadRequestException, NotFoundException } from '@common/filters';
import { CategoryRepository } from '../repository';
import { CreateCategoryUseCase } from './create-category.use-case';
import { FindCategoryByIdUseCase } from './find-category-by-id.use-case';
import { FindCategoryBySlugUseCase } from './find-category-by-slug.use-case';
import { makeCategoryDetails, makeCreateCategoryDTO } from './test-helpers';

describe('CreateCategoryUseCase', () => {
  let categoryRepository: jest.Mocked<CategoryRepository>;
  let findCategoryByIdUseCase: jest.Mocked<Pick<FindCategoryByIdUseCase, 'execute'>>;
  let findCategoryBySlugUseCase: jest.Mocked<
    Pick<FindCategoryBySlugUseCase, 'execute'>
  >;
  let useCase: CreateCategoryUseCase;

  beforeEach(() => {
    categoryRepository = {
      findByOrder: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<CategoryRepository>;

    findCategoryByIdUseCase = {
      execute: jest.fn(),
    };

    findCategoryBySlugUseCase = {
      execute: jest.fn(),
    };

    useCase = new CreateCategoryUseCase(
      categoryRepository,
      findCategoryByIdUseCase as unknown as FindCategoryByIdUseCase,
      findCategoryBySlugUseCase as unknown as FindCategoryBySlugUseCase,
    );
  });

  it('deve criar quando slug e ordem estiverem livres e não houver pai', async () => {
    const dto = makeCreateCategoryDTO();

    findCategoryBySlugUseCase.execute.mockRejectedValue(
      new NotFoundException('Categoria não encontrada'),
    );
    categoryRepository.findByOrder.mockResolvedValue(null);
    categoryRepository.create.mockResolvedValue();

    await expect(
      useCase.execute('org-id', dto, 'user-id'),
    ).resolves.toBeUndefined();

    expect(categoryRepository.create).toHaveBeenCalledWith(
      'org-id',
      dto,
      'user-id',
    );
    expect(findCategoryByIdUseCase.execute).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando o slug já existir', async () => {
    const dto = makeCreateCategoryDTO({ slug: 'dup' });

    findCategoryBySlugUseCase.execute.mockResolvedValue({
      id: 'existing-id',
      slug: 'dup',
    });

    const result = useCase.execute('org-id', dto, 'user-id');

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toThrow(
      'Já existe uma categoria com este slug',
    );

    expect(categoryRepository.create).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando a ordem já estiver em uso', async () => {
    const dto = makeCreateCategoryDTO({ order: 3 });

    findCategoryBySlugUseCase.execute.mockRejectedValue(
      new NotFoundException('Categoria não encontrada'),
    );
    categoryRepository.findByOrder.mockResolvedValue({
      id: 'other-id',
      order: 3,
    });

    await expect(useCase.execute('org-id', dto, 'user-id')).rejects.toThrow(
      'Já existe uma categoria com esta ordem nesta organização',
    );

    expect(categoryRepository.create).not.toHaveBeenCalled();
  });

  it('deve criar com pai quando o pai estiver ativo', async () => {
    const dto = makeCreateCategoryDTO({ parentId: 'parent-id' });
    const parent = makeCategoryDetails({
      id: 'parent-id',
      isActive: true,
    });

    findCategoryBySlugUseCase.execute.mockRejectedValue(
      new NotFoundException('Categoria não encontrada'),
    );
    categoryRepository.findByOrder.mockResolvedValue(null);
    findCategoryByIdUseCase.execute.mockResolvedValue(parent);
    categoryRepository.create.mockResolvedValue();

    await expect(
      useCase.execute('org-id', dto, 'user-id'),
    ).resolves.toBeUndefined();

    expect(findCategoryByIdUseCase.execute).toHaveBeenCalledWith(
      'parent-id',
      'org-id',
    );
    expect(categoryRepository.create).toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando a categoria pai estiver inativa', async () => {
    const dto = makeCreateCategoryDTO({ parentId: 'parent-id' });

    findCategoryBySlugUseCase.execute.mockRejectedValue(
      new NotFoundException('Categoria não encontrada'),
    );
    categoryRepository.findByOrder.mockResolvedValue(null);
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

    findCategoryBySlugUseCase.execute.mockRejectedValue(
      new NotFoundException('Categoria não encontrada'),
    );
    categoryRepository.findByOrder.mockResolvedValue(null);
    findCategoryByIdUseCase.execute.mockRejectedValue(
      new NotFoundException('Categoria não encontrada'),
    );

    await expect(useCase.execute('org-id', dto, 'user-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(categoryRepository.create).not.toHaveBeenCalled();
  });
});
