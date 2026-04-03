import { NotFoundException } from '@common/filters';
import { CategoryRepository } from '../repository';
import { FindCategoryBySlugUseCase } from './find-category-by-slug.use-case';

describe('FindCategoryBySlugUseCase', () => {
  let categoryRepository: jest.Mocked<CategoryRepository>;
  let useCase: FindCategoryBySlugUseCase;

  beforeEach(() => {
    categoryRepository = {
      findBySlug: jest.fn(),
    } as unknown as jest.Mocked<CategoryRepository>;

    useCase = new FindCategoryBySlugUseCase(categoryRepository);
  });

  it('deve retornar a categoria quando existir', async () => {
    const row = { id: 'cat-id', slug: 'meu-slug' };

    categoryRepository.findBySlug.mockResolvedValue(row);

    await expect(
      useCase.execute('meu-slug', 'org-id'),
    ).resolves.toEqual(row);
    expect(categoryRepository.findBySlug).toHaveBeenCalledWith(
      'meu-slug',
      'org-id',
    );
  });

  it('deve lançar NotFoundException quando não existir', async () => {
    categoryRepository.findBySlug.mockResolvedValue(null);

    const result = useCase.execute('missing', 'org-id');

    await expect(result).rejects.toBeInstanceOf(NotFoundException);
    await expect(result).rejects.toThrow('Categoria não encontrada');
  });
});
