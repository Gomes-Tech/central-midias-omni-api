import { StorageService } from '@infrastructure/providers';
import { MaterialRepository } from '../repository';
import { SearchMaterialsUseCase } from './search-materials.use-case';
import {
  makeMaterialListItem,
  makeSearchMaterialsFiltersDTO,
} from './test-helpers';

describe('SearchMaterialsUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let storageService: jest.Mocked<Pick<StorageService, 'getPublicUrl'>>;
  let useCase: SearchMaterialsUseCase;

  beforeEach(() => {
    materialRepository = {
      search: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;
    storageService = {
      getPublicUrl: jest.fn(),
    };

    useCase = new SearchMaterialsUseCase(
      materialRepository,
      storageService as unknown as StorageService,
    );
  });

  it('deve retornar os materiais filtrados', async () => {
    const filters = makeSearchMaterialsFiltersDTO({ term: 'campanha' });
    const material = {
      ...makeMaterialListItem(),
      materialFile: 'materials/material-id/preview.png',
    };
    const response = {
      data: [material],
      total: 1,
      page: 1,
      totalPages: 1,
    };

    materialRepository.search.mockResolvedValue(response);
    storageService.getPublicUrl.mockResolvedValue(
      'https://cdn.test/preview.png',
    );

    await expect(
      useCase.execute('org-id', 'user-id', filters),
    ).resolves.toEqual({
      ...response,
      data: [
        {
          ...material,
          materialFile: 'https://cdn.test/preview.png',
        },
      ],
    });
    expect(materialRepository.search).toHaveBeenCalledWith(
      'org-id',
      'user-id',
      filters,
    );
    expect(storageService.getPublicUrl).toHaveBeenCalledWith(
      'materials/material-id/preview.png',
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
