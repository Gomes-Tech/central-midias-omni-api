import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { SocialHighlightRepository } from '../repository';
import { CreateSocialHighlightUseCase } from './create-social-highlight.use-case';
import {
  makeCreateSocialHighlightDTO,
  makeCreateSocialHighlightFiles,
  makeStorageFile,
} from './test-helpers';

describe('CreateSocialHighlightUseCase', () => {
  let useCase: CreateSocialHighlightUseCase;
  let socialHighlightRepository: jest.Mocked<SocialHighlightRepository>;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    socialHighlightRepository = {
      create: jest.fn(),
    } as unknown as jest.Mocked<SocialHighlightRepository>;

    storageService = {
      uploadFile: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    useCase = new CreateSocialHighlightUseCase(socialHighlightRepository, storageService);
  });

  it('deve impedir criação quando a data inicial for maior que a data final', async () => {
    const dto = makeCreateSocialHighlightDTO({
      initialDate: new Date('2024-02-10T00:00:00.000Z'),
      finishDate: new Date('2024-02-01T00:00:00.000Z'),
    });
    const files = makeCreateSocialHighlightFiles();

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
    expect(socialHighlightRepository.create).not.toHaveBeenCalled();
  });

  it('deve impedir criação quando os arquivos obrigatórios não forem enviados', async () => {
    const dto = makeCreateSocialHighlightDTO();

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
    expect(socialHighlightRepository.create).not.toHaveBeenCalled();
  });

  it('deve impedir criação quando somente o arquivo mobile for enviado', async () => {
    const dto = makeCreateSocialHighlightDTO();
    const files = makeCreateSocialHighlightFiles();

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
    expect(socialHighlightRepository.create).not.toHaveBeenCalled();
  });

  it('deve impedir criação quando somente o arquivo desktop for enviado', async () => {
    const dto = makeCreateSocialHighlightDTO();
    const files = makeCreateSocialHighlightFiles();

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
    expect(socialHighlightRepository.create).not.toHaveBeenCalled();
  });

  it('deve criar banner com upload das imagens e payload correto', async () => {
    const dto = makeCreateSocialHighlightDTO();
    const files = makeCreateSocialHighlightFiles();

    storageService.uploadFile
      .mockResolvedValueOnce(
        makeStorageFile({
          path: 'social-highlights/mobile/social-highlight-mobile.png',
          fullPath: '/tmp/social-highlights/mobile/social-highlight-mobile.png',
          publicUrl: '/storage/social-highlights/mobile/social-highlight-mobile.png',
        }),
      )
      .mockResolvedValueOnce(
        makeStorageFile({
          id: 'desktop-file-id',
          path: 'social-highlights/social-highlight-desktop.png',
          fullPath: '/tmp/social-highlights/social-highlight-desktop.png',
          publicUrl: '/storage/social-highlights/social-highlight-desktop.png',
        }),
      );
    socialHighlightRepository.create.mockResolvedValue();

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
      'social-highlights/mobile',
    );
    expect(storageService.uploadFile).toHaveBeenNthCalledWith(
      2,
      files.desktop,
      'social-highlights',
    );
    expect(socialHighlightRepository.create).toHaveBeenCalledWith(
      'organization-id',
      {
        ...dto,
        mobileImageKey: 'social-highlights/mobile/social-highlight-mobile.png',
        desktopImageKey: 'social-highlights/social-highlight-desktop.png',
      },
      'user-id',
    );
  });

  it('deve propagar erro quando o upload das imagens falhar', async () => {
    const dto = makeCreateSocialHighlightDTO();
    const files = makeCreateSocialHighlightFiles();
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

    expect(socialHighlightRepository.create).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando a criação no repositório falhar', async () => {
    const dto = makeCreateSocialHighlightDTO();
    const files = makeCreateSocialHighlightFiles();
    const error = new Error('Falha ao criar banner');

    storageService.uploadFile
      .mockResolvedValueOnce(
        makeStorageFile({
          publicUrl: '/storage/social-highlights/mobile/social-highlight-mobile.png',
        }),
      )
      .mockResolvedValueOnce(
        makeStorageFile({
          publicUrl: '/storage/social-highlights/social-highlight-desktop.png',
        }),
      );
    socialHighlightRepository.create.mockRejectedValue(error);

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
    expect(socialHighlightRepository.create).toHaveBeenCalledTimes(1);
  });
});
