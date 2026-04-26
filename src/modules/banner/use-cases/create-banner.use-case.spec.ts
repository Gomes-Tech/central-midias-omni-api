import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { BannerRepository } from '../repository';
import { CreateBannerUseCase } from './create-banner.use-case';
import {
  makeCreateBannerDTO,
  makeCreateBannerFiles,
  makeStorageFile,
} from './test-helpers';

describe('CreateBannerUseCase', () => {
  let useCase: CreateBannerUseCase;
  let bannerRepository: jest.Mocked<BannerRepository>;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    bannerRepository = {
      create: jest.fn(),
    } as unknown as jest.Mocked<BannerRepository>;

    storageService = {
      uploadFile: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    useCase = new CreateBannerUseCase(bannerRepository, storageService);
  });

  it('deve impedir criação quando a data inicial for maior que a data final', async () => {
    const dto = makeCreateBannerDTO({
      initialDate: new Date('2024-02-10T00:00:00.000Z'),
      finishDate: new Date('2024-02-01T00:00:00.000Z'),
    });
    const files = makeCreateBannerFiles();

    const result = useCase.execute(
      'organization-id',
      dto,
      'user-id',
      files as unknown as {
        desktop: Express.Multer.File;
        mobile: Express.Multer.File;
      },
    );

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toThrow(
      'A data inicial não pode ser maior que a data final',
    );

    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(bannerRepository.create).not.toHaveBeenCalled();
  });

  it('deve impedir criação quando os arquivos obrigatórios não forem enviados', async () => {
    const dto = makeCreateBannerDTO();

    const result = useCase.execute(
      'organization-id',
      dto,
      'user-id',
      {} as {
        desktop: Express.Multer.File;
        mobile: Express.Multer.File;
      },
    );

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toThrow(
      'Os arquivos mobileImage e desktopImage são obrigatórios',
    );

    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(bannerRepository.create).not.toHaveBeenCalled();
  });

  it('deve impedir criação quando somente o arquivo mobile for enviado', async () => {
    const dto = makeCreateBannerDTO();
    const files = makeCreateBannerFiles();

    const result = useCase.execute('organization-id', dto, 'user-id', {
      mobile: files.mobile,
    } as {
      desktop: Express.Multer.File;
      mobile: Express.Multer.File;
    });

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toThrow(
      'Os arquivos mobileImage e desktopImage são obrigatórios',
    );

    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(bannerRepository.create).not.toHaveBeenCalled();
  });

  it('deve impedir criação quando somente o arquivo desktop for enviado', async () => {
    const dto = makeCreateBannerDTO();
    const files = makeCreateBannerFiles();

    const result = useCase.execute('organization-id', dto, 'user-id', {
      desktop: files.desktop,
    } as {
      desktop: Express.Multer.File;
      mobile: Express.Multer.File;
    });

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toThrow(
      'Os arquivos mobileImage e desktopImage são obrigatórios',
    );

    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(bannerRepository.create).not.toHaveBeenCalled();
  });

  it('deve criar banner com upload das imagens e payload correto', async () => {
    const dto = makeCreateBannerDTO();
    const files = makeCreateBannerFiles();

    storageService.uploadFile
      .mockResolvedValueOnce(
        makeStorageFile({
          path: 'banners/mobile/banner-mobile.png',
          fullPath: '/tmp/banners/mobile/banner-mobile.png',
          publicUrl: '/storage/banners/mobile/banner-mobile.png',
        }),
      )
      .mockResolvedValueOnce(
        makeStorageFile({
          id: 'desktop-file-id',
          path: 'banners/banner-desktop.png',
          fullPath: '/tmp/banners/banner-desktop.png',
          publicUrl: '/storage/banners/banner-desktop.png',
        }),
      );
    bannerRepository.create.mockResolvedValue();

    await expect(
      useCase.execute(
        'organization-id',
        dto,
        'user-id',
        files as unknown as {
          desktop: Express.Multer.File;
          mobile: Express.Multer.File;
        },
      ),
    ).resolves.toBeUndefined();

    expect(storageService.uploadFile).toHaveBeenCalledTimes(2);
    expect(storageService.uploadFile).toHaveBeenNthCalledWith(
      1,
      files.mobile,
      'banners/mobile',
    );
    expect(storageService.uploadFile).toHaveBeenNthCalledWith(
      2,
      files.desktop,
      'banners',
    );
    expect(bannerRepository.create).toHaveBeenCalledWith(
      'organization-id',
      {
        ...dto,
        mobileImageKey: 'banners/mobile/banner-mobile.png',
        desktopImageKey: 'banners/banner-desktop.png',
      },
      'user-id',
    );
  });

  it('deve propagar erro quando o upload das imagens falhar', async () => {
    const dto = makeCreateBannerDTO();
    const files = makeCreateBannerFiles();
    const error = new Error('Falha no upload');

    storageService.uploadFile.mockRejectedValue(error);

    await expect(
      useCase.execute(
        'organization-id',
        dto,
        'user-id',
        files as unknown as {
          desktop: Express.Multer.File;
          mobile: Express.Multer.File;
        },
      ),
    ).rejects.toBe(error);

    expect(bannerRepository.create).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando a criação no repositório falhar', async () => {
    const dto = makeCreateBannerDTO();
    const files = makeCreateBannerFiles();
    const error = new Error('Falha ao criar banner');

    storageService.uploadFile
      .mockResolvedValueOnce(
        makeStorageFile({
          publicUrl: '/storage/banners/mobile/banner-mobile.png',
        }),
      )
      .mockResolvedValueOnce(
        makeStorageFile({
          publicUrl: '/storage/banners/banner-desktop.png',
        }),
      );
    bannerRepository.create.mockRejectedValue(error);

    await expect(
      useCase.execute(
        'organization-id',
        dto,
        'user-id',
        files as unknown as {
          desktop: Express.Multer.File;
          mobile: Express.Multer.File;
        },
      ),
    ).rejects.toBe(error);

    expect(storageService.uploadFile).toHaveBeenCalledTimes(2);
    expect(bannerRepository.create).toHaveBeenCalledTimes(1);
  });
});
