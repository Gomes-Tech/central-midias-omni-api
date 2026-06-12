import { StorageService } from '@infrastructure/providers';
import { NotFoundException } from '@common/filters';
import { SocialHighlightRepository } from '../repository';
import { GetSocialHighlightUseCase } from './get-social-highlight-by-id.use-case';
import { makeSocialHighlight } from './test-helpers';

describe('GetSocialHighlightUseCase', () => {
  let useCase: GetSocialHighlightUseCase;
  let socialHighlightRepository: jest.Mocked<SocialHighlightRepository>;
  let storageService: jest.Mocked<Pick<StorageService, 'getPublicUrl'>>;

  beforeEach(() => {
    socialHighlightRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<SocialHighlightRepository>;
    storageService = {
      getPublicUrl: jest.fn(),
    };

    useCase = new GetSocialHighlightUseCase(
      socialHighlightRepository,
      storageService as unknown as StorageService,
    );
  });

  it('deve retornar banner por id', async () => {
    const banner = makeSocialHighlight();
    const expectedSocialHighlight = {
      ...banner,
      mobileImageUrl: 'https://cdn.test/social-highlight-mobile.png',
      desktopImageUrl: 'https://cdn.test/social-highlight-desktop.png',
    };

    socialHighlightRepository.findById.mockResolvedValue(banner);
    storageService.getPublicUrl
      .mockResolvedValueOnce(expectedSocialHighlight.mobileImageUrl)
      .mockResolvedValueOnce(expectedSocialHighlight.desktopImageUrl);

    await expect(
      useCase.execute(banner.id, banner.organizationId),
    ).resolves.toEqual(expectedSocialHighlight);
  });

  it('deve chamar socialHighlightRepository.findById com id e organizationId corretos', async () => {
    const banner = makeSocialHighlight();
    const expectedSocialHighlight = {
      ...banner,
      mobileImageUrl: 'https://cdn.test/social-highlight.png',
      desktopImageUrl: 'https://cdn.test/social-highlight.png',
    };
    storageService.getPublicUrl.mockResolvedValue('https://cdn.test/social-highlight.png');

    socialHighlightRepository.findById.mockResolvedValue(banner);

    await expect(
      useCase.execute(banner.id, banner.organizationId),
    ).resolves.toEqual(expectedSocialHighlight);

    expect(socialHighlightRepository.findById).toHaveBeenCalledWith(
      banner.id,
      banner.organizationId,
    );
  });

  it('deve lançar not found quando o banner não existir', async () => {
    socialHighlightRepository.findById.mockResolvedValue(null);

    const result = useCase.execute('missing-social-highlight-id', 'organization-id');

    await expect(result).rejects.toBeInstanceOf(NotFoundException);
    await expect(result).rejects.toThrow('Destaque social não encontrado');
  });

  it('deve propagar erro quando socialHighlightRepository.findById falhar', async () => {
    const error = new Error('Erro ao buscar destaque social');

    socialHighlightRepository.findById.mockRejectedValue(error);

    await expect(useCase.execute('social-highlight-id', 'organization-id')).rejects.toBe(
      error,
    );
  });
});
