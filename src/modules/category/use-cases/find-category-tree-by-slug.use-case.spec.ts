import { CategoryRepository } from '../repository';
import { FindCategoryTreeBySlugUseCase } from './find-category-tree-by-slug.use-case';

describe('FindCategoryTreeBySlugUseCase', () => {
  let categoryRepository: jest.Mocked<CategoryRepository>;
  let useCase: FindCategoryTreeBySlugUseCase;

  beforeEach(() => {
    categoryRepository = {
      findTreeBySlug: jest.fn(),
    } as unknown as jest.Mocked<CategoryRepository>;

    useCase = new FindCategoryTreeBySlugUseCase(categoryRepository);
  });

  it('deve retornar path e tree da categoria', async () => {
    const payload = {
      path: [{ id: '1', name: 'Root', slug: 'root' }],
      tree: [],
    };

    categoryRepository.findTreeBySlug.mockResolvedValue(payload);

    await expect(
      useCase.execute('slug', 'org-id', 'user-id'),
    ).resolves.toEqual(payload);
    expect(categoryRepository.findTreeBySlug).toHaveBeenCalledWith(
      'slug',
      'org-id',
      'user-id',
    );
  });
});
