import { CategoryRepository } from '../repository';
import { FindAllCategoriesUseCase } from './find-all-categories.use-case';

describe('FindAllCategoriesUseCase', () => {
  let categoryRepository: jest.Mocked<CategoryRepository>;
  let useCase: FindAllCategoriesUseCase;

  beforeEach(() => {
    categoryRepository = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<CategoryRepository>;

    useCase = new FindAllCategoriesUseCase(categoryRepository);
  });

  it('deve retornar a lista de categorias', async () => {
    const list = [
      {
        id: '1',
        name: 'A',
        slug: 'a',
        isActive: true,
        order: 0,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    categoryRepository.findAll.mockResolvedValue(list);

    await expect(useCase.execute('org-id')).resolves.toEqual(list);
    expect(categoryRepository.findAll).toHaveBeenCalledWith('org-id', {});
  });

  it('deve repassar filtros ao repositório', async () => {
    categoryRepository.findAll.mockResolvedValue([]);

    const filters = { isActive: true, searchTerm: 'x' };

    await useCase.execute('org-id', filters);

    expect(categoryRepository.findAll).toHaveBeenCalledWith('org-id', filters);
  });
});
