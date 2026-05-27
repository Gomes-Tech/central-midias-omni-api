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
    const materials = [makeMaterialListItem()];

    materialRepository.findAll.mockResolvedValue(materials);

    await expect(useCase.execute('org-id', filters)).resolves.toEqual(materials);
    expect(materialRepository.findAll).toHaveBeenCalledWith('org-id', filters);
  });

  it('deve usar filtros vazios quando não informados', async () => {
    const materials = [makeMaterialListItem()];

    materialRepository.findAll.mockResolvedValue(materials);

    await expect(useCase.execute('org-id')).resolves.toEqual(materials);
    expect(materialRepository.findAll).toHaveBeenCalledWith('org-id', {});
  });
});
