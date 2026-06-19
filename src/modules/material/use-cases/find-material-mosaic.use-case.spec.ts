import { StorageService } from '@infrastructure/providers';
import { MaterialRepository } from '../repository';
import { FindMaterialMosaicUseCase } from './find-material-mosaic.use-case';

describe('FindMaterialMosaicUseCase', () => {
  let materialRepository: jest.Mocked<
    Pick<MaterialRepository, 'findLatestImageMaterialsPerCategory'>
  >;
  let storageService: jest.Mocked<Pick<StorageService, 'getPublicUrl'>>;
  let useCase: FindMaterialMosaicUseCase;

  const materialWithImage = {
    id: 'material-1',
    name: 'Material com imagem',
    description: 'Descricao',
    categoryId: 'category-1',
    materialFiles: [
      {
        id: 'file-1',
        materialId: 'material-1',
        imageKey: 'materials/material-1/preview.png',
        mimeType: 'application/pdf',
        size: 2048,
      },
      {
        id: 'file-2',
        materialId: 'material-1',
        imageKey: 'materials/material-1/preview.png',
        mimeType: 'image/png',
        size: 1024,
      },
    ],
  };

  beforeEach(() => {
    materialRepository = {
      findLatestImageMaterialsPerCategory: jest.fn(),
    };
    storageService = {
      getPublicUrl: jest.fn(),
    };

    useCase = new FindMaterialMosaicUseCase(
      materialRepository as unknown as MaterialRepository,
      storageService as unknown as StorageService,
    );
  });

  it('deve retornar id e imageUrl sem expor imageKey', async () => {
    materialRepository.findLatestImageMaterialsPerCategory.mockResolvedValue([
      materialWithImage,
    ]);
    storageService.getPublicUrl.mockResolvedValue('https://cdn.test/preview.png');

    const result = await useCase.execute('org-id', 'user-id');

    expect(
      materialRepository.findLatestImageMaterialsPerCategory,
    ).toHaveBeenCalledWith('org-id', 'user-id', 6);
    expect(storageService.getPublicUrl).toHaveBeenCalledWith(
      'materials/material-1/preview.png',
    );
    expect(result).toEqual([
      {
        id: 'material-1',
        imageUrl: 'https://cdn.test/preview.png',
      },
    ]);
    expect(result[0]).not.toHaveProperty('imageKey');
  });

  it('deve retornar imageUrl nula quando material não tiver arquivo de imagem', async () => {
    materialRepository.findLatestImageMaterialsPerCategory.mockResolvedValue([
      {
        ...materialWithImage,
        materialFiles: [
          {
            id: 'file-1',
            materialId: 'material-1',
            imageKey: 'materials/material-1/doc.pdf',
            mimeType: 'application/pdf',
            size: 2048,
          },
        ],
      },
    ]);

    const result = await useCase.execute('org-id', 'user-id');

    expect(result).toEqual([
      {
        id: 'material-1',
        imageUrl: null,
      },
    ]);
    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
  });

  it('deve retornar array vazio quando não houver materiais acessíveis', async () => {
    materialRepository.findLatestImageMaterialsPerCategory.mockResolvedValue(
      [],
    );

    await expect(useCase.execute('org-id', 'user-id')).resolves.toEqual([]);
    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
  });
});
