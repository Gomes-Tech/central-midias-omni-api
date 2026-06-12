import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { SocialHighlightRepository } from '../repository';
import { GetSocialHighlightUseCase } from './get-social-highlight-by-id.use-case';
import {
  makeSocialHighlight,
  makeSocialHighlightFile,
  makeStorageFile,
  makeUpdateSocialHighlightDTO,
  makeUpdateSocialHighlightFiles,
} from './test-helpers';
import { UpdateSocialHighlightUseCase } from './update-social-highlight.use-case';

describe('UpdateSocialHighlightUseCase', () => {
  let useCase: UpdateSocialHighlightUseCase;
  let socialHighlightRepository: jest.Mocked<SocialHighlightRepository>;
  let getSocialHighlightUseCase: jest.Mocked<GetSocialHighlightUseCase>;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    socialHighlightRepository = {
      update: jest.fn(),
    } as unknown as jest.Mocked<SocialHighlightRepository>;

    getSocialHighlightUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetSocialHighlightUseCase>;

    storageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    useCase = new UpdateSocialHighlightUseCase(
      socialHighlightRepository,
      getSocialHighlightUseCase,
      storageService,
    );
  });

  const emptyUpdateSocialHighlightFiles = {
    mobileImage: undefined as unknown as Express.Multer.File,
    desktopImage: undefined as unknown as Express.Multer.File,
  };

  it('deve impedir atualização quando a data inicial enviada for maior que a data final enviada', async () => {
    getSocialHighlightUseCase.execute.mockResolvedValue(makeSocialHighlight());

    const result = useCase.execute(
      'social-highlight-id',
      'organization-id',
      makeUpdateSocialHighlightDTO({
        initialDate: new Date('2024-02-10T00:00:00.000Z'),
        finishDate: new Date('2024-02-01T00:00:00.000Z'),
      }),
      'user-id',
      emptyUpdateSocialHighlightFiles,
    );

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toThrow(
      'A data inicial não pode ser maior que a data final',
    );

    expect(getSocialHighlightUseCase.execute).toHaveBeenCalledWith(
      'social-highlight-id',
      'organization-id',
    );
    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(storageService.deleteFile).not.toHaveBeenCalled();
    expect(socialHighlightRepository.update).not.toHaveBeenCalled();
  });

  it('deve impedir atualização quando a combinação entre data atual e nova data ficar inválida', async () => {
    getSocialHighlightUseCase.execute.mockResolvedValue(
      makeSocialHighlight({
        initialDate: new Date('2024-01-10T00:00:00.000Z'),
        finishDate: new Date('2024-01-20T00:00:00.000Z'),
      }),
    );

    const result = useCase.execute(
      'social-highlight-id',
      'organization-id',
      makeUpdateSocialHighlightDTO({
        initialDate: undefined,
        finishDate: new Date('2024-01-05T00:00:00.000Z'),
      }),
      'user-id',
      emptyUpdateSocialHighlightFiles,
    );

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toThrow(
      'A data inicial não pode ser maior que a data final',
    );

    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(storageService.deleteFile).not.toHaveBeenCalled();
    expect(socialHighlightRepository.update).not.toHaveBeenCalled();
  });

  it('deve atualizar somente os campos enviados quando não houver novas imagens', async () => {
    getSocialHighlightUseCase.execute.mockResolvedValue(makeSocialHighlight());
    socialHighlightRepository.update.mockResolvedValue();

    await expect(
      useCase.execute(
        'social-highlight-id',
        'organization-id',
        makeUpdateSocialHighlightDTO({
          link: null,
          initialDate: null,
          finishDate: undefined,
        }),
        'user-id',
        emptyUpdateSocialHighlightFiles,
      ),
    ).resolves.toBeUndefined();

    expect(getSocialHighlightUseCase.execute).toHaveBeenCalledWith(
      'social-highlight-id',
      'organization-id',
    );
    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(storageService.deleteFile).not.toHaveBeenCalled();
    expect(socialHighlightRepository.update).toHaveBeenCalledWith(
      'social-highlight-id',
      'organization-id',
      {
        name: 'Destaque social atualizado',
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
    const files = makeUpdateSocialHighlightFiles();

    getSocialHighlightUseCase.execute.mockResolvedValue(
      makeSocialHighlight({
        mobileImageKey: '/storage/social-highlights/mobile/social-highlight-old-mobile.png',
        desktopImageKey: '/storage/social-highlights/social-highlight-old-desktop.png',
      }),
    );
    storageService.uploadFile
      .mockResolvedValueOnce(
        makeStorageFile({
          path: 'social-highlights/social-highlight-new-mobile.png',
          fullPath: '/tmp/social-highlights/social-highlight-new-mobile.png',
          publicUrl: '/storage/social-highlights/social-highlight-new-mobile.png',
        }),
      )
      .mockResolvedValueOnce(
        makeStorageFile({
          id: 'desktop-file-id',
          path: 'social-highlights/social-highlight-new-desktop.png',
          fullPath: '/tmp/social-highlights/social-highlight-new-desktop.png',
          publicUrl: '/storage/social-highlights/social-highlight-new-desktop.png',
        }),
      );
    storageService.deleteFile.mockResolvedValue();
    socialHighlightRepository.update.mockResolvedValue();

    await expect(
      useCase.execute(
        'social-highlight-id',
        'organization-id',
        makeUpdateSocialHighlightDTO(),
        'user-id',
        files,
      ),
    ).resolves.toBeUndefined();

    expect(storageService.uploadFile).toHaveBeenNthCalledWith(
      1,
      files.mobileImage,
      'social-highlights',
    );
    expect(storageService.uploadFile).toHaveBeenNthCalledWith(
      2,
      files.desktopImage,
      'social-highlights',
    );
    expect(storageService.deleteFile).toHaveBeenNthCalledWith(1, [
      'social-highlights/mobile/social-highlight-old-mobile.png',
    ]);
    expect(storageService.deleteFile).toHaveBeenNthCalledWith(2, [
      'social-highlights/social-highlight-old-desktop.png',
    ]);
    expect(socialHighlightRepository.update).toHaveBeenCalledWith(
      'social-highlight-id',
      'organization-id',
      {
        ...makeUpdateSocialHighlightDTO(),
        mobileImageKey: 'social-highlights/social-highlight-new-mobile.png',
        desktopImageKey: 'social-highlights/social-highlight-new-desktop.png',
      },
      'user-id',
    );
  });

  it('deve atualizar banner quando somente uma nova mobileImage for enviada', async () => {
    const files = {
      mobileImage: makeSocialHighlightFile({ originalname: 'social-highlight-mobile.png' }),
      desktopImage: undefined as unknown as Express.Multer.File,
    };

    getSocialHighlightUseCase.execute.mockResolvedValue(
      makeSocialHighlight({
        mobileImageKey: '/storage/social-highlights/mobile/social-highlight-old-mobile.png',
        desktopImageKey: '/storage/social-highlights/social-highlight-old-desktop.png',
      }),
    );
    storageService.uploadFile.mockResolvedValue(
      makeStorageFile({
        path: 'social-highlights/social-highlight-new-mobile.png',
        fullPath: '/tmp/social-highlights/social-highlight-new-mobile.png',
        publicUrl: '/storage/social-highlights/social-highlight-new-mobile.png',
      }),
    );
    storageService.deleteFile.mockResolvedValue();
    socialHighlightRepository.update.mockResolvedValue();

    await expect(
      useCase.execute(
        'social-highlight-id',
        'organization-id',
        makeUpdateSocialHighlightDTO(),
        'user-id',
        files,
      ),
    ).resolves.toBeUndefined();

    expect(storageService.uploadFile).toHaveBeenCalledTimes(1);
    expect(storageService.uploadFile).toHaveBeenCalledWith(
      files.mobileImage,
      'social-highlights',
    );
    expect(storageService.deleteFile).toHaveBeenCalledTimes(1);
    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'social-highlights/mobile/social-highlight-old-mobile.png',
    ]);
    expect(socialHighlightRepository.update).toHaveBeenCalledWith(
      'social-highlight-id',
      'organization-id',
      {
        ...makeUpdateSocialHighlightDTO(),
        mobileImageKey: 'social-highlights/social-highlight-new-mobile.png',
      },
      'user-id',
    );
  });

  it('deve atualizar banner quando somente uma nova desktopImage for enviada', async () => {
    const files = {
      mobileImage: undefined as unknown as Express.Multer.File,
      desktopImage: makeSocialHighlightFile({ originalname: 'social-highlight-desktop.png' }),
    };

    getSocialHighlightUseCase.execute.mockResolvedValue(
      makeSocialHighlight({
        mobileImageKey: '/storage/social-highlights/mobile/social-highlight-old-mobile.png',
        desktopImageKey: '/storage/social-highlights/social-highlight-old-desktop.png',
      }),
    );
    storageService.uploadFile.mockResolvedValue(
      makeStorageFile({
        path: 'social-highlights/social-highlight-new-desktop.png',
        fullPath: '/tmp/social-highlights/social-highlight-new-desktop.png',
        publicUrl: '/storage/social-highlights/social-highlight-new-desktop.png',
      }),
    );
    storageService.deleteFile.mockResolvedValue();
    socialHighlightRepository.update.mockResolvedValue();

    await expect(
      useCase.execute(
        'social-highlight-id',
        'organization-id',
        makeUpdateSocialHighlightDTO(),
        'user-id',
        files,
      ),
    ).resolves.toBeUndefined();

    expect(storageService.uploadFile).toHaveBeenCalledTimes(1);
    expect(storageService.uploadFile).toHaveBeenCalledWith(
      files.desktopImage,
      'social-highlights',
    );
    expect(storageService.deleteFile).toHaveBeenCalledTimes(1);
    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'social-highlights/social-highlight-old-desktop.png',
    ]);
    expect(socialHighlightRepository.update).toHaveBeenCalledWith(
      'social-highlight-id',
      'organization-id',
      {
        ...makeUpdateSocialHighlightDTO(),
        desktopImageKey: 'social-highlights/social-highlight-new-desktop.png',
      },
      'user-id',
    );
  });

  it('deve propagar erro quando getSocialHighlightUseCase.execute falhar', async () => {
    const error = new Error('Erro ao buscar destaque social atual');

    getSocialHighlightUseCase.execute.mockRejectedValue(error);

    await expect(
      useCase.execute(
        'social-highlight-id',
        'organization-id',
        makeUpdateSocialHighlightDTO(),
        'user-id',
        emptyUpdateSocialHighlightFiles,
      ),
    ).rejects.toBe(error);

    expect(socialHighlightRepository.update).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando storageService.uploadFile falhar', async () => {
    const error = new Error('Erro no upload');
    const files = makeUpdateSocialHighlightFiles();

    getSocialHighlightUseCase.execute.mockResolvedValue(makeSocialHighlight());
    storageService.uploadFile.mockRejectedValue(error);

    await expect(
      useCase.execute(
        'social-highlight-id',
        'organization-id',
        makeUpdateSocialHighlightDTO(),
        'user-id',
        files,
      ),
    ).rejects.toBe(error);

    expect(storageService.deleteFile).not.toHaveBeenCalled();
    expect(socialHighlightRepository.update).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando storageService.deleteFile falhar', async () => {
    const error = new Error('Erro ao remover arquivo anterior');
    const files = {
      mobileImage: makeSocialHighlightFile({ originalname: 'social-highlight-mobile.png' }),
      desktopImage: undefined as unknown as Express.Multer.File,
    };

    getSocialHighlightUseCase.execute.mockResolvedValue(
      makeSocialHighlight({
        mobileImageKey: '/storage/social-highlights/mobile/social-highlight-old-mobile.png',
      }),
    );
    storageService.uploadFile.mockResolvedValue(
      makeStorageFile({
        publicUrl: '/storage/social-highlights/social-highlight-new-mobile.png',
      }),
    );
    storageService.deleteFile.mockRejectedValue(error);

    await expect(
      useCase.execute(
        'social-highlight-id',
        'organization-id',
        makeUpdateSocialHighlightDTO(),
        'user-id',
        files,
      ),
    ).rejects.toBe(error);

    expect(socialHighlightRepository.update).not.toHaveBeenCalled();
  });

  it('deve usar datas do banner quando update não enviar initialDate/finishDate', async () => {
    getSocialHighlightUseCase.execute.mockResolvedValue(
      makeSocialHighlight({
        initialDate: new Date('2024-06-01T00:00:00.000Z'),
        finishDate: new Date('2024-06-30T00:00:00.000Z'),
      }),
    );
    socialHighlightRepository.update.mockResolvedValue(undefined);

    await useCase.execute(
      'social-highlight-id',
      'organization-id',
      makeUpdateSocialHighlightDTO({
        name: 'só nome',
        initialDate: undefined,
        finishDate: undefined,
      }),
      'user-id',
      emptyUpdateSocialHighlightFiles,
    );

    expect(socialHighlightRepository.update).toHaveBeenCalled();
  });

  it('deve usar finishDate do banner quando payload enviar somente initialDate', async () => {
    getSocialHighlightUseCase.execute.mockResolvedValue(
      makeSocialHighlight({
        initialDate: new Date('2024-01-01T00:00:00.000Z'),
        finishDate: new Date('2024-01-20T00:00:00.000Z'),
      }),
    );
    socialHighlightRepository.update.mockResolvedValue(undefined);

    await useCase.execute(
      'social-highlight-id',
      'organization-id',
      makeUpdateSocialHighlightDTO({
        initialDate: new Date('2024-01-05T00:00:00.000Z'),
        finishDate: undefined,
      }),
      'user-id',
      emptyUpdateSocialHighlightFiles,
    );

    expect(socialHighlightRepository.update).toHaveBeenCalledWith(
      'social-highlight-id',
      'organization-id',
      makeUpdateSocialHighlightDTO({
        initialDate: new Date('2024-01-05T00:00:00.000Z'),
        finishDate: undefined,
      }),
      'user-id',
    );
  });

  it('deve impedir atualização quando initialDate enviada for maior que finishDate do banner', async () => {
    getSocialHighlightUseCase.execute.mockResolvedValue(
      makeSocialHighlight({
        initialDate: new Date('2024-01-01T00:00:00.000Z'),
        finishDate: new Date('2024-01-10T00:00:00.000Z'),
      }),
    );

    const result = useCase.execute(
      'social-highlight-id',
      'organization-id',
      makeUpdateSocialHighlightDTO({
        initialDate: new Date('2024-01-15T00:00:00.000Z'),
        finishDate: undefined,
      }),
      'user-id',
      emptyUpdateSocialHighlightFiles,
    );

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toThrow(
      'A data inicial não pode ser maior que a data final',
    );
    expect(socialHighlightRepository.update).not.toHaveBeenCalled();
  });

  it('deve atualizar quando banner não tiver datas e payload também não enviar datas', async () => {
    getSocialHighlightUseCase.execute.mockResolvedValue(
      makeSocialHighlight({
        initialDate: null,
        finishDate: null,
      }),
    );
    socialHighlightRepository.update.mockResolvedValue(undefined);

    await useCase.execute(
      'social-highlight-id',
      'organization-id',
      makeUpdateSocialHighlightDTO({
        initialDate: undefined,
        finishDate: undefined,
      }),
      'user-id',
      emptyUpdateSocialHighlightFiles,
    );

    expect(socialHighlightRepository.update).toHaveBeenCalledWith(
      'social-highlight-id',
      'organization-id',
      makeUpdateSocialHighlightDTO({
        initialDate: undefined,
        finishDate: undefined,
      }),
      'user-id',
    );
  });

  it('deve atualizar sem upload quando files for undefined', async () => {
    getSocialHighlightUseCase.execute.mockResolvedValue(makeSocialHighlight());
    socialHighlightRepository.update.mockResolvedValue(undefined);

    await useCase.execute(
      'social-highlight-id',
      'organization-id',
      makeUpdateSocialHighlightDTO({ name: 'sem arquivos' }),
      'user-id',
      undefined as unknown as {
        desktopImage: Express.Multer.File;
        mobileImage: Express.Multer.File;
      },
    );

    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(storageService.deleteFile).not.toHaveBeenCalled();
    expect(socialHighlightRepository.update).toHaveBeenCalled();
  });

  it('deve manter path absoluto ao remover desktop antigo sem prefixo /storage/', async () => {
    const files = {
      mobileImage: undefined as unknown as Express.Multer.File,
      desktopImage: makeSocialHighlightFile({ originalname: 'social-highlight-desktop.png' }),
    };

    getSocialHighlightUseCase.execute.mockResolvedValue(
      makeSocialHighlight({
        desktopImageKey: 'social-highlights/raw-desktop.png',
      }),
    );
    storageService.uploadFile.mockResolvedValue(
      makeStorageFile({ path: 'social-highlights/new-desktop.png' }),
    );
    storageService.deleteFile.mockResolvedValue(undefined);
    socialHighlightRepository.update.mockResolvedValue(undefined);

    await useCase.execute(
      'social-highlight-id',
      'organization-id',
      makeUpdateSocialHighlightDTO(),
      'user-id',
      files,
    );

    expect(storageService.uploadFile).toHaveBeenCalledWith(
      files.desktopImage,
      'social-highlights',
    );
    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'social-highlights/raw-desktop.png',
    ]);
    expect(socialHighlightRepository.update).toHaveBeenCalledWith(
      'social-highlight-id',
      'organization-id',
      {
        ...makeUpdateSocialHighlightDTO(),
        desktopImageKey: 'social-highlights/new-desktop.png',
      },
      'user-id',
    );
  });

  it('deve manter path absoluto ao remover imagem antiga sem prefixo /storage/', async () => {
    const files = {
      mobileImage: makeSocialHighlightFile({ originalname: 'social-highlight-mobile.png' }),
      desktopImage: undefined as unknown as Express.Multer.File,
    };

    getSocialHighlightUseCase.execute.mockResolvedValue(
      makeSocialHighlight({
        mobileImageKey: 'social-highlights/mobile/raw-key.png',
      }),
    );
    storageService.uploadFile.mockResolvedValue(
      makeStorageFile({ publicUrl: 'social-highlights/mobile/new.png' }),
    );

    await useCase.execute(
      'social-highlight-id',
      'organization-id',
      makeUpdateSocialHighlightDTO(),
      'user-id',
      files,
    );

    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'social-highlights/mobile/raw-key.png',
    ]);
  });

  it('deve propagar erro quando socialHighlightRepository.update falhar', async () => {
    const error = new Error('Erro ao atualizar destaque social');

    getSocialHighlightUseCase.execute.mockResolvedValue(makeSocialHighlight());
    socialHighlightRepository.update.mockRejectedValue(error);

    await expect(
      useCase.execute(
        'social-highlight-id',
        'organization-id',
        makeUpdateSocialHighlightDTO(),
        'user-id',
        emptyUpdateSocialHighlightFiles,
      ),
    ).rejects.toBe(error);
  });
});
