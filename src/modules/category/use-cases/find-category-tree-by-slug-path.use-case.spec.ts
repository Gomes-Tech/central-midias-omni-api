import { CategoryRepository } from '../repository';
import { FindCategoryTreeBySlugPathUseCase } from './find-category-tree-by-slug-path.use-case';

describe('FindCategoryTreeBySlugPathUseCase', () => {
  let categoryRepository: jest.Mocked<CategoryRepository>;
  let useCase: FindCategoryTreeBySlugPathUseCase;

  beforeEach(() => {
    categoryRepository = {
      findTreeBySlugPath: jest.fn(),
    } as unknown as jest.Mocked<CategoryRepository>;

    useCase = new FindCategoryTreeBySlugPathUseCase(categoryRepository);
  });

  it('deve retornar path e tree da categoria', async () => {
    const payload = {
      path: [{ id: '1', name: 'Root', slug: 'root', slugPath: 'root' }],
      tree: [],
    };

    categoryRepository.findTreeBySlugPath.mockResolvedValue(payload);

    await expect(
      useCase.execute('marketing/redes-sociais', 'org-id', 'user-id'),
    ).resolves.toEqual(payload);
    expect(categoryRepository.findTreeBySlugPath).toHaveBeenCalledWith(
      'marketing/redes-sociais',
      'org-id',
      'user-id',
    );
  });
});
