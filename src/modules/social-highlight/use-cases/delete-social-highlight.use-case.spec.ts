import { StorageService } from '@infrastructure/providers';
import { SocialHighlightRepository } from '../repository';
import { DeleteSocialHighlightUseCase } from './delete-social-highlight.use-case';
import { GetSocialHighlightUseCase } from './get-social-highlight-by-id.use-case';
import { makeSocialHighlight } from './test-helpers';

describe('DeleteSocialHighlightUseCase', () => {
  let useCase: DeleteSocialHighlightUseCase;
  let socialHighlightRepository: jest.Mocked<SocialHighlightRepository>;
  let getSocialHighlightUseCase: jest.Mocked<GetSocialHighlightUseCase>;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    socialHighlightRepository = {
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<SocialHighlightRepository>;

    getSocialHighlightUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetSocialHighlightUseCase>;

    storageService = {
      deleteFile: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    useCase = new DeleteSocialHighlightUseCase(
      socialHighlightRepository,
      getSocialHighlightUseCase,
      storageService,
    );
  });

  it('deve validar o banner antes de excluir e remover os arquivos associados', async () => {
    getSocialHighlightUseCase.execute.mockResolvedValue(
      makeSocialHighlight({
        mobileImageKey: '/storage/social-highlights/mobile/social-highlight-mobile.png',
        desktopImageKey: 'https://cdn.test/social-highlights/social-highlight-desktop.png',
      }),
    );
    socialHighlightRepository.softDelete.mockResolvedValue();
    storageService.deleteFile.mockResolvedValue();

    await expect(
      useCase.execute('social-highlight-id', 'organization-id', 'user-id'),
    ).resolves.toBeUndefined();

    expect(getSocialHighlightUseCase.execute).toHaveBeenCalledWith(
      'social-highlight-id',
      'organization-id',
    );
    expect(socialHighlightRepository.softDelete).toHaveBeenCalledWith(
      'social-highlight-id',
      'organization-id',
      'user-id',
    );
    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'social-highlights/mobile/social-highlight-mobile.png',
      'https://cdn.test/social-highlights/social-highlight-desktop.png',
    ]);
  });

  it('deve propagar erro quando getSocialHighlightUseCase.execute falhar', async () => {
    const error = new Error('Erro ao validar banner');

    getSocialHighlightUseCase.execute.mockRejectedValue(error);

    await expect(
      useCase.execute('social-highlight-id', 'organization-id', 'user-id'),
    ).rejects.toBe(error);

    expect(socialHighlightRepository.softDelete).not.toHaveBeenCalled();
    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando socialHighlightRepository.softDelete falhar', async () => {
    const error = new Error('Erro ao remover destaque social');

    getSocialHighlightUseCase.execute.mockResolvedValue(makeSocialHighlight());
    socialHighlightRepository.softDelete.mockRejectedValue(error);

    await expect(
      useCase.execute('social-highlight-id', 'organization-id', 'user-id'),
    ).rejects.toBe(error);

    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando storageService.deleteFile falhar', async () => {
    const error = new Error('Erro ao remover arquivos');

    getSocialHighlightUseCase.execute.mockResolvedValue(makeSocialHighlight());
    socialHighlightRepository.softDelete.mockResolvedValue();
    storageService.deleteFile.mockRejectedValue(error);

    await expect(
      useCase.execute('social-highlight-id', 'organization-id', 'user-id'),
    ).rejects.toBe(error);

    expect(socialHighlightRepository.softDelete).toHaveBeenCalledWith(
      'social-highlight-id',
      'organization-id',
      'user-id',
    );
    expect(storageService.deleteFile).toHaveBeenCalledTimes(1);
  });
});
