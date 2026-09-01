import { CategoryRepository } from '../repository';
import { FindAccessibleSubcategoriesBySlugUseCase } from './find-accessible-subcategories-by-slug.use-case';

describe('FindAccessibleSubcategoriesBySlugUseCase', () => {
  let categoryRepository: jest.Mocked<CategoryRepository>;
  let useCase: FindAccessibleSubcategoriesBySlugUseCase;

  beforeEach(() => {
    categoryRepository = {
      findAccessibleSubcategoriesBySlug: jest.fn(),
    } as unknown as jest.Mocked<CategoryRepository>;

    useCase = new FindAccessibleSubcategoriesBySlugUseCase(categoryRepository);
  });

  it('deve retornar as subcategorias acessíveis', async () => {
    const payload = [
      { name: 'Redes Sociais', slugPath: 'marketing/redes-sociais' },
    ];

    categoryRepository.findAccessibleSubcategoriesBySlug.mockResolvedValue(
      payload,
    );

    await expect(
      useCase.execute('marketing', 'org-id', 'user-id'),
    ).resolves.toEqual(payload);
    expect(
      categoryRepository.findAccessibleSubcategoriesBySlug,
    ).toHaveBeenCalledWith('marketing', 'org-id', 'user-id');
  });
});
