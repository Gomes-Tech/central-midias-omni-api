import { CategoryRepository } from '../repository';
import { FindCategoryTreeUseCase } from './find-category-tree.use-case';

describe('FindCategoryTreeUseCase', () => {
  let categoryRepository: jest.Mocked<CategoryRepository>;
  let useCase: FindCategoryTreeUseCase;

  beforeEach(() => {
    categoryRepository = {
      findTree: jest.fn(),
    } as unknown as jest.Mocked<CategoryRepository>;

    useCase = new FindCategoryTreeUseCase(categoryRepository);
  });

  it('deve retornar a árvore de categorias', async () => {
    const tree = [] as Awaited<
      ReturnType<CategoryRepository['findTree']>
    >;

    categoryRepository.findTree.mockResolvedValue(tree);

    await expect(useCase.execute('org-id', 'user-id')).resolves.toEqual(tree);
    expect(categoryRepository.findTree).toHaveBeenCalledWith(
      'org-id',
      'user-id',
    );
  });
});
