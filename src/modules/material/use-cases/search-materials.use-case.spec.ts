import { MaterialRepository } from '../repository';
import { SearchMaterialsUseCase } from './search-materials.use-case';
import {
  makeMaterialListItem,
  makeSearchMaterialsFiltersDTO,
} from './test-helpers';

describe('SearchMaterialsUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let useCase: SearchMaterialsUseCase;

  beforeEach(() => {
    materialRepository = {
      search: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;

    useCase = new SearchMaterialsUseCase(materialRepository);
  });

  it('deve retornar os materiais filtrados', async () => {
    const filters = makeSearchMaterialsFiltersDTO({ term: 'campanha' });
    const response = {
      data: [makeMaterialListItem()],
      total: 1,
      page: 1,
      totalPages: 1,
    };

    materialRepository.search.mockResolvedValue(response);

    await expect(
      useCase.execute('org-id', 'user-id', filters),
    ).resolves.toEqual(response);
    expect(materialRepository.search).toHaveBeenCalledWith(
      'org-id',
      'user-id',
      filters,
    );
  });

  it('deve usar filtros vazios quando não informados', async () => {
    const response = {
      data: [],
      total: 0,
      page: 1,
      totalPages: 0,
    };

    materialRepository.search.mockResolvedValue(response);

    await expect(useCase.execute('org-id', 'user-id')).resolves.toEqual(
      response,
    );
    expect(materialRepository.search).toHaveBeenCalledWith(
      'org-id',
      'user-id',
      {},
    );
  });
});
