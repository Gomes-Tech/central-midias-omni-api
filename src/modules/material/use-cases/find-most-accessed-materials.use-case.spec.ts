import { StorageService } from '@infrastructure/providers';
import { MaterialRepository } from '../repository';
import { FindMostAccessedMaterialsUseCase } from './find-most-accessed-materials.use-case';

describe('FindMostAccessedMaterialsUseCase', () => {
  let materialRepository: jest.Mocked<
    Pick<
      MaterialRepository,
      'findMostViewedMaterials' | 'findLatestMaterialsPerCategory'
    >
  >;
  let storageService: jest.Mocked<Pick<StorageService, 'getPublicUrl'>>;
  let useCase: FindMostAccessedMaterialsUseCase;

  const viewedMaterial = {
    id: 'material-1',
    name: 'Material mais visto',
    description: 'Descricao',
    categoryId: 'category-1',
    materialFiles: [
      {
        id: 'file-1',
        materialId: 'material-1',
        imageKey: 'materials/material-1/preview.png',
        mimeType: 'image/png',
        size: 1024,
      },
    ],
  };

  const fallbackMaterial = {
    id: 'material-2',
    name: 'Material recente',
    description: 'Descricao recente',
    categoryId: 'category-2',
    materialFiles: [
      {
        id: 'file-2',
        materialId: 'material-2',
        imageKey: 'materials/material-2/doc.pdf',
        mimeType: 'application/pdf',
        size: 2048,
      },
    ],
  };

  beforeEach(() => {
    materialRepository = {
      findMostViewedMaterials: jest.fn(),
      findLatestMaterialsPerCategory: jest.fn(),
    };
    storageService = {
      getPublicUrl: jest.fn(),
    };

    useCase = new FindMostAccessedMaterialsUseCase(
      materialRepository as unknown as MaterialRepository,
      storageService as unknown as StorageService,
    );
  });

  it('deve retornar top 3 por visualizações sem buscar fallback', async () => {
    const materials = [viewedMaterial, { ...viewedMaterial, id: 'material-3' }, { ...viewedMaterial, id: 'material-4' }];
    materialRepository.findMostViewedMaterials.mockResolvedValue(materials);
    storageService.getPublicUrl.mockResolvedValue('https://cdn.test/preview.png');

    const result = await useCase.execute('org-id', 'user-id');

    expect(result).toHaveLength(3);
    expect(materialRepository.findLatestMaterialsPerCategory).not.toHaveBeenCalled();
    expect(result[0]).toEqual({
      id: 'material-1',
      name: 'Material mais visto',
      description: 'Descricao',
      mobileUrl: 'https://cdn.test/preview.png',
      desktopUrl: 'https://cdn.test/preview.png',
    });
  });

  it('deve completar com fallback quando houver menos de 3 materiais visualizados', async () => {
    materialRepository.findMostViewedMaterials.mockResolvedValue([viewedMaterial]);
    materialRepository.findLatestMaterialsPerCategory.mockResolvedValue([
      fallbackMaterial,
    ]);
    storageService.getPublicUrl
      .mockResolvedValueOnce('https://cdn.test/preview.png')
      .mockResolvedValueOnce('https://cdn.test/doc.pdf');

    const result = await useCase.execute('org-id', 'user-id');

    expect(result).toHaveLength(2);
    expect(materialRepository.findLatestMaterialsPerCategory).toHaveBeenCalledWith(
      'org-id',
      'user-id',
      2,
      ['material-1'],
    );
    expect(result[1]).toEqual({
      id: 'material-2',
      name: 'Material recente',
      description: 'Descricao recente',
      mobileUrl: 'https://cdn.test/doc.pdf',
      desktopUrl: 'https://cdn.test/doc.pdf',
    });
  });

  it('deve retornar array vazio quando não houver materiais acessíveis', async () => {
    materialRepository.findMostViewedMaterials.mockResolvedValue([]);
    materialRepository.findLatestMaterialsPerCategory.mockResolvedValue([]);

    await expect(useCase.execute('org-id', 'user-id')).resolves.toEqual([]);
  });

  it('deve retornar URLs nulas quando material não tiver arquivos', async () => {
    materialRepository.findMostViewedMaterials.mockResolvedValue([
      {
        ...viewedMaterial,
        materialFiles: [],
      },
    ]);
    materialRepository.findLatestMaterialsPerCategory.mockResolvedValue([]);

    await expect(useCase.execute('org-id', 'user-id')).resolves.toEqual([
      {
        id: 'material-1',
        name: 'Material mais visto',
        description: 'Descricao',
        mobileUrl: null,
        desktopUrl: null,
      },
    ]);

    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
  });
});
