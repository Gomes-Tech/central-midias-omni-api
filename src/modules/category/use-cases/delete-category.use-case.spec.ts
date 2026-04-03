import { NotFoundException } from '@common/filters';
import { CategoryRepository } from '../repository';
import { DeleteCategoryUseCase } from './delete-category.use-case';
import { FindCategoryByIdUseCase } from './find-category-by-id.use-case';
import { makeCategoryDetails } from './test-helpers';

describe('DeleteCategoryUseCase', () => {
  let categoryRepository: jest.Mocked<Pick<CategoryRepository, 'delete'>>;
  let findCategoryByIdUseCase: jest.Mocked<Pick<FindCategoryByIdUseCase, 'execute'>>;
  let useCase: DeleteCategoryUseCase;

  beforeEach(() => {
    categoryRepository = {
      delete: jest.fn(),
    };

    findCategoryByIdUseCase = {
      execute: jest.fn(),
    };

    useCase = new DeleteCategoryUseCase(
      categoryRepository as unknown as CategoryRepository,
      findCategoryByIdUseCase as unknown as FindCategoryByIdUseCase,
    );
  });

  it('deve remover após garantir que a categoria existe', async () => {
    const category = makeCategoryDetails({ id: 'cat-1' });

    findCategoryByIdUseCase.execute.mockResolvedValue(category);
    categoryRepository.delete.mockResolvedValue();

    await expect(
      useCase.execute('cat-1', 'org-id', 'user-id'),
    ).resolves.toBeUndefined();

    expect(findCategoryByIdUseCase.execute).toHaveBeenCalledWith(
      'cat-1',
      'org-id',
    );
    expect(categoryRepository.delete).toHaveBeenCalledWith(
      'cat-1',
      'org-id',
      'user-id',
    );
  });

  it('deve propagar NotFound quando a categoria não existir', async () => {
    findCategoryByIdUseCase.execute.mockRejectedValue(
      new NotFoundException('Categoria não encontrada'),
    );

    await expect(
      useCase.execute('missing', 'org-id', 'user-id'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(categoryRepository.delete).not.toHaveBeenCalled();
  });
});
