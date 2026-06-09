import { MaterialRepository } from '../repository';
import { FindAllMaterialsUseCase } from './find-all-materials.use-case';
import {
  makeFindAllMaterialsFiltersDTO,
  makeMaterialListItem,
} from './test-helpers';

describe('FindAllMaterialsUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let useCase: FindAllMaterialsUseCase;

  beforeEach(() => {
    materialRepository = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;

    useCase = new FindAllMaterialsUseCase(materialRepository);
  });

  it('deve retornar os materiais filtrados', async () => {
    const filters = makeFindAllMaterialsFiltersDTO({ searchTerm: 'inst' });
    const response = {
      data: [makeMaterialListItem()],
      total: 1,
      page: 1,
      totalPages: 1,
    };

    materialRepository.findAll.mockResolvedValue(response);

    await expect(useCase.execute('org-id', filters)).resolves.toEqual(response);
    expect(materialRepository.findAll).toHaveBeenCalledWith(filters, 'org-id');
  });

  it('deve usar filtros vazios quando não informados', async () => {
    const response = {
      data: [makeMaterialListItem()],
      total: 1,
      page: 1,
      totalPages: 1,
    };

    materialRepository.findAll.mockResolvedValue(response);

    await expect(useCase.execute('org-id')).resolves.toEqual(response);
    expect(materialRepository.findAll).toHaveBeenCalledWith({}, 'org-id');
  });
});
