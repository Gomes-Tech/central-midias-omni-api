import { StorageService } from '@infrastructure/providers';
import { MaterialRepository } from '../repository';
import { FindMaterialsByCategorySlugUseCase } from './find-materials-by-category-slug.use-case';

describe('FindMaterialsByCategorySlugUseCase', () => {
  let materialRepository: jest.Mocked<
    Pick<MaterialRepository, 'findByCategorySlugPath'>
  >;
  let storageService: jest.Mocked<Pick<StorageService, 'getPublicUrl'>>;
  let useCase: FindMaterialsByCategorySlugUseCase;

  const baseMaterial = {
    id: 'material-1',
    name: 'Banner institucional',
    description: 'Descrição',
    externalLink: null,
    hasTextCopy: false,
    textCopy: null,
    isCustomizable: false,
    imageKey: 'materials/material-1/preview.png',
    mimeType: 'image/png',
    size: 2048,
  };

  beforeEach(() => {
    materialRepository = {
      findByCategorySlugPath: jest.fn(),
    };
    storageService = {
      getPublicUrl: jest.fn(),
    };

    useCase = new FindMaterialsByCategorySlugUseCase(
      materialRepository as unknown as MaterialRepository,
      storageService as unknown as StorageService,
    );
  });

  it('deve retornar imageUrl quando o material for uma imagem com imageKey', async () => {
    materialRepository.findByCategorySlugPath.mockResolvedValue({
      data: [baseMaterial],
      total: 1,
      page: 1,
      totalPages: 1,
    });
    storageService.getPublicUrl.mockResolvedValue(
      'https://cdn.test/preview.png',
    );

    const result = await useCase.execute('org-id', 'categoria/slug', {
      page: 1,
      limit: 24,
    });

    expect(materialRepository.findByCategorySlugPath).toHaveBeenCalledWith(
      'org-id',
      'categoria/slug',
      { page: 1, limit: 24 },
    );
    expect(storageService.getPublicUrl).toHaveBeenCalledWith(
      'materials/material-1/preview.png',
      840,
    );
    expect(result).toEqual({
      data: [
        {
          id: 'material-1',
          name: 'Banner institucional',
          description: 'Descrição',
          imageUrl: 'https://cdn.test/preview.png',
          mimeType: 'image/png',
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
  });

  it('deve usar filtros vazios quando não informados', async () => {
    materialRepository.findByCategorySlugPath.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      totalPages: 0,
    });

    await expect(
      useCase.execute('org-id', 'categoria/slug'),
    ).resolves.toEqual({ data: [], total: 0, page: 1, totalPages: 0 });
    expect(materialRepository.findByCategorySlugPath).toHaveBeenCalledWith(
      'org-id',
      'categoria/slug',
      {},
    );
  });

  it('deve retornar imageUrl nula quando o mimeType não for de imagem', async () => {
    materialRepository.findByCategorySlugPath.mockResolvedValue({
      data: [{ ...baseMaterial, mimeType: 'application/pdf' }],
      total: 1,
      page: 1,
      totalPages: 1,
    });

    const result = await useCase.execute('org-id', 'categoria/slug');

    expect(result.data[0].imageUrl).toBeNull();
    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
  });

  it('deve retornar imageUrl nula quando não houver imageKey', async () => {
    materialRepository.findByCategorySlugPath.mockResolvedValue({
      data: [{ ...baseMaterial, imageKey: null }],
      total: 1,
      page: 1,
      totalPages: 1,
    });

    const result = await useCase.execute('org-id', 'categoria/slug');

    expect(result.data[0].imageUrl).toBeNull();
    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
  });

  it('deve retornar imageUrl nula quando mimeType for nulo', async () => {
    materialRepository.findByCategorySlugPath.mockResolvedValue({
      data: [{ ...baseMaterial, mimeType: null }],
      total: 1,
      page: 1,
      totalPages: 1,
    });

    const result = await useCase.execute('org-id', 'categoria/slug');

    expect(result.data[0].imageUrl).toBeNull();
    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
  });

  it('deve retornar imageUrl nula quando storageService falhar', async () => {
    materialRepository.findByCategorySlugPath.mockResolvedValue({
      data: [baseMaterial],
      total: 1,
      page: 1,
      totalPages: 1,
    });
    storageService.getPublicUrl.mockRejectedValue(new Error('s3 down'));

    const result = await useCase.execute('org-id', 'categoria/slug');

    expect(result.data[0].imageUrl).toBeNull();
  });

  it('deve retornar lista vazia quando não houver materiais', async () => {
    materialRepository.findByCategorySlugPath.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      totalPages: 0,
    });

    await expect(
      useCase.execute('org-id', 'categoria/slug'),
    ).resolves.toEqual({ data: [], total: 0, page: 1, totalPages: 0 });
    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
  });
});
