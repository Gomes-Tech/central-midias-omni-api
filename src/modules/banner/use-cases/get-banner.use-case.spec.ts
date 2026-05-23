import { StorageService } from '@infrastructure/providers';
import { NotFoundException } from '@common/filters';
import { BannerRepository } from '../repository';
import { GetBannerUseCase } from './get-banner-by-id.use-case';
import { makeBanner } from './test-helpers';

describe('GetBannerUseCase', () => {
  let useCase: GetBannerUseCase;
  let bannerRepository: jest.Mocked<BannerRepository>;
  let storageService: jest.Mocked<Pick<StorageService, 'getPublicUrl'>>;

  beforeEach(() => {
    bannerRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<BannerRepository>;
    storageService = {
      getPublicUrl: jest.fn(),
    };

    useCase = new GetBannerUseCase(
      bannerRepository,
      storageService as unknown as StorageService,
    );
  });

  it('deve retornar banner por id', async () => {
    const banner = makeBanner();
    const expectedBanner = {
      ...banner,
      mobileImageUrl: 'https://cdn.test/banner-mobile.png',
      desktopImageUrl: 'https://cdn.test/banner-desktop.png',
    };

    bannerRepository.findById.mockResolvedValue(banner);
    storageService.getPublicUrl
      .mockResolvedValueOnce(expectedBanner.mobileImageUrl)
      .mockResolvedValueOnce(expectedBanner.desktopImageUrl);

    await expect(
      useCase.execute(banner.id, banner.organizationId),
    ).resolves.toEqual(expectedBanner);
  });

  it('deve chamar bannerRepository.findById com id e organizationId corretos', async () => {
    const banner = makeBanner();
    const expectedBanner = {
      ...banner,
      mobileImageUrl: 'https://cdn.test/banner.png',
      desktopImageUrl: 'https://cdn.test/banner.png',
    };
    storageService.getPublicUrl.mockResolvedValue('https://cdn.test/banner.png');

    bannerRepository.findById.mockResolvedValue(banner);

    await expect(
      useCase.execute(banner.id, banner.organizationId),
    ).resolves.toEqual(expectedBanner);

    expect(bannerRepository.findById).toHaveBeenCalledWith(
      banner.id,
      banner.organizationId,
    );
  });

  it('deve lançar not found quando o banner não existir', async () => {
    bannerRepository.findById.mockResolvedValue(null);

    const result = useCase.execute('missing-banner-id', 'organization-id');

    await expect(result).rejects.toBeInstanceOf(NotFoundException);
    await expect(result).rejects.toThrow('Banner não encontrado');
  });

  it('deve propagar erro quando bannerRepository.findById falhar', async () => {
    const error = new Error('Erro ao buscar banner');

    bannerRepository.findById.mockRejectedValue(error);

    await expect(useCase.execute('banner-id', 'organization-id')).rejects.toBe(
      error,
    );
  });
});
