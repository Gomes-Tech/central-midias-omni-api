import { StorageService } from '@infrastructure/providers';
import { MaterialRepository } from '../repository';
import { SearchMaterialsUseCase } from './search-materials.use-case';
import { makeSearchMaterialsFiltersDTO } from './test-helpers';

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

  it('deve retornar os materiais filtrados com imageUrl', async () => {
    const filters = makeSearchMaterialsFiltersDTO({ term: 'campanha' });
    const response = {
      data: [
        {
          id: 'material-id',
          name: 'Material campanha',
          description: 'Descricao',
          externalLink: null,
          hasTextCopy: false,
          textCopy: null,
          isCustomizable: true,
          imageKey: 'materials/material-id/preview.png',
          mimeType: 'image/png',
          size: 1024,
        },
      ],
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
      data: [
        {
          id: 'material-id',
          name: 'Material campanha',
          description: 'Descricao',
          imageUrl: 'https://cdn.test/preview.png',
          mimeType: 'image/png',
          size: 1024,
          externalLink: null,
          hasTextCopy: false,
          textCopy: null,
          isCustomizable: true,
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    });
    expect(materialRepository.search).toHaveBeenCalledWith(
      'org-id',
      'user-id',
      filters,
    );
    expect(storageService.getPublicUrl).toHaveBeenCalledWith(
      'materials/material-id/preview.png',
      840,
    );
  });

  it('não deve gerar imageUrl para arquivos que não são imagem', async () => {
    const filters = makeSearchMaterialsFiltersDTO({ term: 'campanha' });
    const response = {
      data: [
        {
          id: 'material-id',
          name: 'Material PDF',
          description: null,
          externalLink: null,
          hasTextCopy: false,
          textCopy: null,
          isCustomizable: false,
          imageKey: 'materials/material-id/file.pdf',
          mimeType: 'application/pdf',
          size: 2048,
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    };

    materialRepository.search.mockResolvedValue(response);

    await expect(
      useCase.execute('org-id', 'user-id', filters),
    ).resolves.toEqual({
      data: [
        {
          id: 'material-id',
          name: 'Material PDF',
          description: null,
          imageUrl: null,
          mimeType: 'application/pdf',
          size: 2048,
          externalLink: null,
          hasTextCopy: false,
          textCopy: null,
          isCustomizable: false,
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    });
    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
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
