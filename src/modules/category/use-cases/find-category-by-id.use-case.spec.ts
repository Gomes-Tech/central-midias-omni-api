import { NotFoundException } from '@common/filters';
import { CategoryRepository } from '../repository';
import { FindCategoryByIdUseCase } from './find-category-by-id.use-case';
import { makeCategoryDetails } from './test-helpers';

describe('FindCategoryByIdUseCase', () => {
  let categoryRepository: jest.Mocked<CategoryRepository>;
  let useCase: FindCategoryByIdUseCase;

  beforeEach(() => {
    categoryRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<CategoryRepository>;

    useCase = new FindCategoryByIdUseCase(categoryRepository);
  });

  it('deve retornar a categoria quando existir', async () => {
    const category = makeCategoryDetails();

    categoryRepository.findById.mockResolvedValue(category);

    await expect(useCase.execute(category.id, 'org-id')).resolves.toEqual(
      category,
    );
    expect(categoryRepository.findById).toHaveBeenCalledWith(
      category.id,
      'org-id',
    );
  });

  it('deve lançar NotFoundException quando não existir', async () => {
    categoryRepository.findById.mockResolvedValue(null);

    const result = useCase.execute('missing', 'org-id');

    await expect(result).rejects.toBeInstanceOf(NotFoundException);
    await expect(result).rejects.toThrow('Categoria não encontrada');
  });
});
