import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { BannerRepository } from '../repository';
import { GetBannerUseCase } from './get-banner.use-case';
import { UpdateBannerUseCase } from './update-banner.use-case';
import {
  makeBanner,
  makeStorageFile,
  makeUpdateBannerDTO,
  makeUpdateBannerFiles,
} from './test-helpers';

describe('UpdateBannerUseCase', () => {
  let useCase: UpdateBannerUseCase;
  let bannerRepository: jest.Mocked<BannerRepository>;
  let getBannerUseCase: jest.Mocked<GetBannerUseCase>;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    bannerRepository = {
      update: jest.fn(),
    } as unknown as jest.Mocked<BannerRepository>;

    getBannerUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetBannerUseCase>;

    storageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    useCase = new UpdateBannerUseCase(
      bannerRepository,
      getBannerUseCase,
      storageService,
    );
  });

  it('deve impedir atualização quando a data inicial enviada for maior que a data final enviada', async () => {
    getBannerUseCase.execute.mockResolvedValue(makeBanner());

    const result = useCase.execute(
      'banner-id',
      'organization-id',
      makeUpdateBannerDTO({
        initialDate: new Date('2024-02-10T00:00:00.000Z'),
        finishDate: new Date('2024-02-01T00:00:00.000Z'),
      }),
      'user-id',
    );

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toThrow(
      'A data inicial não pode ser maior que a data final',
    );

    expect(getBannerUseCase.execute).toHaveBeenCalledWith(
      'banner-id',
      'organization-id',
    );
    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(storageService.deleteFile).not.toHaveBeenCalled();
    expect(bannerRepository.update).not.toHaveBeenCalled();
  });

  it('deve impedir atualização quando a combinação entre data atual e nova data ficar inválida', async () => {
    getBannerUseCase.execute.mockResolvedValue(
      makeBanner({
        initialDate: new Date('2024-01-10T00:00:00.000Z'),
        finishDate: new Date('2024-01-20T00:00:00.000Z'),
      }),
    );

    const result = useCase.execute(
      'banner-id',
      'organization-id',
      makeUpdateBannerDTO({
        initialDate: undefined,
        finishDate: new Date('2024-01-05T00:00:00.000Z'),
      }),
      'user-id',
    );

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toThrow(
      'A data inicial não pode ser maior que a data final',
    );

    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(storageService.deleteFile).not.toHaveBeenCalled();
    expect(bannerRepository.update).not.toHaveBeenCalled();
  });

  it('deve atualizar somente os campos enviados quando não houver novas imagens', async () => {
    getBannerUseCase.execute.mockResolvedValue(makeBanner());
    bannerRepository.update.mockResolvedValue();

    await expect(
      useCase.execute(
        'banner-id',
        'organization-id',
        makeUpdateBannerDTO({
          link: null,
          initialDate: null,
          finishDate: undefined,
        }),
        'user-id',
      ),
    ).resolves.toBeUndefined();

    expect(getBannerUseCase.execute).toHaveBeenCalledWith(
      'banner-id',
      'organization-id',
    );
    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(storageService.deleteFile).not.toHaveBeenCalled();
    expect(bannerRepository.update).toHaveBeenCalledWith(
      'banner-id',
      'organization-id',
      {
        name: 'Banner atualizado',
        link: null,
        order: 2,
        isActive: false,
        initialDate: null,
        finishDate: undefined,
      },
      'user-id',
    );
  });

  it('deve atualizar banner com novas imagens e remover os arquivos anteriores', async () => {
    const files = makeUpdateBannerFiles();

    getBannerUseCase.execute.mockResolvedValue(
      makeBanner({
        mobileImageKey: '/storage/banners/mobile/banner-old-mobile.png',
        desktopImageKey: '/storage/banners/banner-old-desktop.png',
      }),
    );
    storageService.uploadFile
      .mockResolvedValueOnce(
        makeStorageFile({
          path: 'banners/banner-new-mobile.png',
          fullPath: '/tmp/banners/banner-new-mobile.png',
          publicUrl: '/storage/banners/banner-new-mobile.png',
        }),
      )
      .mockResolvedValueOnce(
        makeStorageFile({
          id: 'desktop-file-id',
          path: 'banners/banner-new-desktop.png',
          fullPath: '/tmp/banners/banner-new-desktop.png',
          publicUrl: '/storage/banners/banner-new-desktop.png',
        }),
      );
    storageService.deleteFile.mockResolvedValue();
    bannerRepository.update.mockResolvedValue();

    await expect(
      useCase.execute(
        'banner-id',
        'organization-id',
        makeUpdateBannerDTO(),
        'user-id',
        files,
      ),
    ).resolves.toBeUndefined();

    expect(storageService.uploadFile).toHaveBeenNthCalledWith(
      1,
      files.mobileImage[0],
      'banners',
    );
    expect(storageService.uploadFile).toHaveBeenNthCalledWith(
      2,
      files.desktopImage[0],
      'banners',
    );
    expect(storageService.deleteFile).toHaveBeenNthCalledWith(1, [
      'banners/mobile/banner-old-mobile.png',
    ]);
    expect(storageService.deleteFile).toHaveBeenNthCalledWith(2, [
      'banners/banner-old-desktop.png',
    ]);
    expect(bannerRepository.update).toHaveBeenCalledWith(
      'banner-id',
      'organization-id',
      {
        ...makeUpdateBannerDTO(),
        mobileImageKey: '/storage/banners/banner-new-mobile.png',
        desktopImageKey: '/storage/banners/banner-new-desktop.png',
      },
      'user-id',
    );
  });

  it('deve atualizar banner quando somente uma nova mobileImage for enviada', async () => {
    const files = makeUpdateBannerFiles({
      desktopImage: [],
    });

    getBannerUseCase.execute.mockResolvedValue(
      makeBanner({
        mobileImageKey: '/storage/banners/mobile/banner-old-mobile.png',
        desktopImageKey: '/storage/banners/banner-old-desktop.png',
      }),
    );
    storageService.uploadFile.mockResolvedValue(
      makeStorageFile({
        path: 'banners/banner-new-mobile.png',
        fullPath: '/tmp/banners/banner-new-mobile.png',
        publicUrl: '/storage/banners/banner-new-mobile.png',
      }),
    );
    storageService.deleteFile.mockResolvedValue();
    bannerRepository.update.mockResolvedValue();

    await expect(
      useCase.execute(
        'banner-id',
        'organization-id',
        makeUpdateBannerDTO(),
        'user-id',
        files,
      ),
    ).resolves.toBeUndefined();

    expect(storageService.uploadFile).toHaveBeenCalledTimes(1);
    expect(storageService.uploadFile).toHaveBeenCalledWith(
      files.mobileImage[0],
      'banners',
    );
    expect(storageService.deleteFile).toHaveBeenCalledTimes(1);
    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'banners/mobile/banner-old-mobile.png',
    ]);
    expect(bannerRepository.update).toHaveBeenCalledWith(
      'banner-id',
      'organization-id',
      {
        ...makeUpdateBannerDTO(),
        mobileImageKey: '/storage/banners/banner-new-mobile.png',
      },
      'user-id',
    );
  });

  it('deve atualizar banner quando somente uma nova desktopImage for enviada', async () => {
    const files = makeUpdateBannerFiles({
      mobileImage: [],
    });

    getBannerUseCase.execute.mockResolvedValue(
      makeBanner({
        mobileImageKey: '/storage/banners/mobile/banner-old-mobile.png',
        desktopImageKey: '/storage/banners/banner-old-desktop.png',
      }),
    );
    storageService.uploadFile.mockResolvedValue(
      makeStorageFile({
        path: 'banners/banner-new-desktop.png',
        fullPath: '/tmp/banners/banner-new-desktop.png',
        publicUrl: '/storage/banners/banner-new-desktop.png',
      }),
    );
    storageService.deleteFile.mockResolvedValue();
    bannerRepository.update.mockResolvedValue();

    await expect(
      useCase.execute(
        'banner-id',
        'organization-id',
        makeUpdateBannerDTO(),
        'user-id',
        files,
      ),
    ).resolves.toBeUndefined();

    expect(storageService.uploadFile).toHaveBeenCalledTimes(1);
    expect(storageService.uploadFile).toHaveBeenCalledWith(
      files.desktopImage[0],
      'banners',
    );
    expect(storageService.deleteFile).toHaveBeenCalledTimes(1);
    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'banners/banner-old-desktop.png',
    ]);
    expect(bannerRepository.update).toHaveBeenCalledWith(
      'banner-id',
      'organization-id',
      {
        ...makeUpdateBannerDTO(),
        desktopImageKey: '/storage/banners/banner-new-desktop.png',
      },
      'user-id',
    );
  });

  it('deve propagar erro quando getBannerUseCase.execute falhar', async () => {
    const error = new Error('Erro ao buscar banner atual');

    getBannerUseCase.execute.mockRejectedValue(error);

    await expect(
      useCase.execute(
        'banner-id',
        'organization-id',
        makeUpdateBannerDTO(),
        'user-id',
      ),
    ).rejects.toBe(error);

    expect(bannerRepository.update).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando storageService.uploadFile falhar', async () => {
    const error = new Error('Erro no upload');
    const files = makeUpdateBannerFiles();

    getBannerUseCase.execute.mockResolvedValue(makeBanner());
    storageService.uploadFile.mockRejectedValue(error);

    await expect(
      useCase.execute(
        'banner-id',
        'organization-id',
        makeUpdateBannerDTO(),
        'user-id',
        files,
      ),
    ).rejects.toBe(error);

    expect(storageService.deleteFile).not.toHaveBeenCalled();
    expect(bannerRepository.update).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando storageService.deleteFile falhar', async () => {
    const error = new Error('Erro ao remover arquivo anterior');
    const files = makeUpdateBannerFiles({
      desktopImage: undefined,
    });

    getBannerUseCase.execute.mockResolvedValue(
      makeBanner({
        mobileImageKey: '/storage/banners/mobile/banner-old-mobile.png',
      }),
    );
    storageService.uploadFile.mockResolvedValue(
      makeStorageFile({
        publicUrl: '/storage/banners/banner-new-mobile.png',
      }),
    );
    storageService.deleteFile.mockRejectedValue(error);

    await expect(
      useCase.execute(
        'banner-id',
        'organization-id',
        makeUpdateBannerDTO(),
        'user-id',
        files,
      ),
    ).rejects.toBe(error);

    expect(bannerRepository.update).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando bannerRepository.update falhar', async () => {
    const error = new Error('Erro ao atualizar banner');

    getBannerUseCase.execute.mockResolvedValue(makeBanner());
    bannerRepository.update.mockRejectedValue(error);

    await expect(
      useCase.execute(
        'banner-id',
        'organization-id',
        makeUpdateBannerDTO(),
        'user-id',
      ),
    ).rejects.toBe(error);
  });
});
