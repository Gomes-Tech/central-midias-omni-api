import { StorageService } from '@infrastructure/providers';
import { BannerRepository } from '../repository';
import { DeleteBannerUseCase } from './delete-banner.use-case';
import { GetBannerUseCase } from './get-banner.use-case';
import { makeBanner } from './test-helpers';

describe('DeleteBannerUseCase', () => {
  let useCase: DeleteBannerUseCase;
  let bannerRepository: jest.Mocked<BannerRepository>;
  let getBannerUseCase: jest.Mocked<GetBannerUseCase>;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    bannerRepository = {
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<BannerRepository>;

    getBannerUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetBannerUseCase>;

    storageService = {
      deleteFile: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    useCase = new DeleteBannerUseCase(
      bannerRepository,
      getBannerUseCase,
      storageService,
    );
  });

  it('deve validar o banner antes de excluir e remover os arquivos associados', async () => {
    getBannerUseCase.execute.mockResolvedValue(
      makeBanner({
        mobileImageUrl: '/storage/banners/mobile/banner-mobile.png',
        desktopImageUrl: 'https://cdn.test/banners/banner-desktop.png',
      }),
    );
    bannerRepository.softDelete.mockResolvedValue();
    storageService.deleteFile.mockResolvedValue();

    await expect(
      useCase.execute('banner-id', 'organization-id', 'user-id'),
    ).resolves.toBeUndefined();

    expect(getBannerUseCase.execute).toHaveBeenCalledWith(
      'banner-id',
      'organization-id',
    );
    expect(bannerRepository.softDelete).toHaveBeenCalledWith(
      'banner-id',
      'organization-id',
      'user-id',
    );
    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'banners/mobile/banner-mobile.png',
      'https://cdn.test/banners/banner-desktop.png',
    ]);
  });

  it('deve propagar erro quando getBannerUseCase.execute falhar', async () => {
    const error = new Error('Erro ao validar banner');

    getBannerUseCase.execute.mockRejectedValue(error);

    await expect(
      useCase.execute('banner-id', 'organization-id', 'user-id'),
    ).rejects.toBe(error);

    expect(bannerRepository.softDelete).not.toHaveBeenCalled();
    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando bannerRepository.softDelete falhar', async () => {
    const error = new Error('Erro ao remover banner');

    getBannerUseCase.execute.mockResolvedValue(makeBanner());
    bannerRepository.softDelete.mockRejectedValue(error);

    await expect(
      useCase.execute('banner-id', 'organization-id', 'user-id'),
    ).rejects.toBe(error);

    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando storageService.deleteFile falhar', async () => {
    const error = new Error('Erro ao remover arquivos');

    getBannerUseCase.execute.mockResolvedValue(makeBanner());
    bannerRepository.softDelete.mockResolvedValue();
    storageService.deleteFile.mockRejectedValue(error);

    await expect(
      useCase.execute('banner-id', 'organization-id', 'user-id'),
    ).rejects.toBe(error);

    expect(bannerRepository.softDelete).toHaveBeenCalledWith(
      'banner-id',
      'organization-id',
      'user-id',
    );
    expect(storageService.deleteFile).toHaveBeenCalledTimes(1);
  });
});
