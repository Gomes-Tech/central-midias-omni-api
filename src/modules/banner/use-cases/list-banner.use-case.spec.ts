import { CacheService } from '@infrastructure/cache';
import { StorageService } from '@infrastructure/providers';
import { BannerRepository } from '../repository';
import { FindListBannersUseCase } from './list-banner.use-case';
import { makeBanner } from './test-helpers';

describe('FindListBannersUseCase', () => {
  let useCase: FindListBannersUseCase;
  let bannerRepository: jest.Mocked<Pick<BannerRepository, 'findList'>>;
  let storageService: jest.Mocked<Pick<StorageService, 'getPublicUrl'>>;
  let cacheService: jest.Mocked<Pick<CacheService, 'get' | 'set'>>;

  const organizationId = 'organization-id';

  beforeEach(() => {
    bannerRepository = { findList: jest.fn() };
    storageService = { getPublicUrl: jest.fn() };
    cacheService = { get: jest.fn(), set: jest.fn() };

    useCase = new FindListBannersUseCase(
      bannerRepository as unknown as BannerRepository,
      storageService as unknown as StorageService,
      cacheService as unknown as CacheService,
    );
  });

  it('deve retornar banners do cache quando existirem', async () => {
    const cached = [
      {
        id: 'banner-id',
        name: 'Banner principal',
        mobileImageUrl: 'https://cdn.test/mobile.png',
        desktopImageUrl: 'https://cdn.test/desktop.png',
      },
    ];

    cacheService.get.mockResolvedValue(cached);

    await expect(useCase.execute(organizationId)).resolves.toEqual(cached);

    expect(cacheService.get).toHaveBeenCalledWith(`banners:${organizationId}`);
    expect(bannerRepository.findList).not.toHaveBeenCalled();
    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
    expect(cacheService.set).not.toHaveBeenCalled();
  });

  it('deve buscar banners, resolver URLs e salvar no cache quando não houver cache', async () => {
    const banner = makeBanner();
    const expected = {
      id: banner.id,
      organizationId: banner.organizationId,
      name: banner.name,
      link: banner.link,
      order: banner.order,
      isActive: banner.isActive,
      initialDate: banner.initialDate,
      finishDate: banner.finishDate,
      isDeleted: banner.isDeleted,
      createdAt: banner.createdAt,
      updatedAt: banner.updatedAt,
      deletedAt: banner.deletedAt,
      mobileImageUrl: 'https://cdn.test/banner-mobile.png',
      desktopImageUrl: 'https://cdn.test/banner-desktop.png',
    };

    cacheService.get.mockResolvedValue(null);
    bannerRepository.findList.mockResolvedValue([banner]);
    storageService.getPublicUrl
      .mockResolvedValueOnce(expected.mobileImageUrl)
      .mockResolvedValueOnce(expected.desktopImageUrl);

    await expect(useCase.execute(organizationId)).resolves.toEqual([expected]);

    expect(bannerRepository.findList).toHaveBeenCalledWith(organizationId);
    expect(storageService.getPublicUrl).toHaveBeenCalledWith(
      banner.mobileImageKey,
    );
    expect(storageService.getPublicUrl).toHaveBeenCalledWith(
      banner.desktopImageKey,
    );
    expect(cacheService.set).toHaveBeenCalledWith(
      `banners:${organizationId}`,
      [expected],
      60 * 15,
    );
  });

  it('deve retornar URLs nulas quando não houver chaves de imagem', async () => {
    const banner = makeBanner({
      mobileImageKey: null as unknown as string,
      desktopImageKey: null as unknown as string,
    });

    cacheService.get.mockResolvedValue(null);
    bannerRepository.findList.mockResolvedValue([banner]);

    const [result] = await useCase.execute(organizationId);

    expect(result.mobileImageUrl).toBeNull();
    expect(result.desktopImageUrl).toBeNull();
    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
  });

  it('deve retornar URL nula quando storage falhar ao gerar URL pública', async () => {
    const banner = makeBanner();

    cacheService.get.mockResolvedValue(null);
    bannerRepository.findList.mockResolvedValue([banner]);
    storageService.getPublicUrl.mockRejectedValue(new Error('storage down'));

    const [result] = await useCase.execute(organizationId);

    expect(result.mobileImageUrl).toBeNull();
    expect(result.desktopImageUrl).toBeNull();
  });

  it('deve propagar erro quando bannerRepository.findList falhar', async () => {
    const error = new Error('Erro ao listar banners');

    cacheService.get.mockResolvedValue(null);
    bannerRepository.findList.mockRejectedValue(error);

    await expect(useCase.execute(organizationId)).rejects.toBe(error);
    expect(cacheService.set).not.toHaveBeenCalled();
  });
});
