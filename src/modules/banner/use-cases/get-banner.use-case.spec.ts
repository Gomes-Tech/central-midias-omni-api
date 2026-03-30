import { NotFoundException } from '@common/filters';
import { BannerRepository } from '../repository';
import { GetBannerUseCase } from './get-banner.use-case';
import { makeBanner } from './test-helpers';

describe('GetBannerUseCase', () => {
  let useCase: GetBannerUseCase;
  let bannerRepository: jest.Mocked<BannerRepository>;

  beforeEach(() => {
    bannerRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<BannerRepository>;

    useCase = new GetBannerUseCase(bannerRepository);
  });

  it('deve retornar banner por id', async () => {
    const banner = makeBanner();

    bannerRepository.findById.mockResolvedValue(banner);

    await expect(
      useCase.execute(banner.id, banner.organizationId),
    ).resolves.toEqual(banner);
  });

  it('deve chamar bannerRepository.findById com id e organizationId corretos', async () => {
    const banner = makeBanner();

    bannerRepository.findById.mockResolvedValue(banner);

    await expect(
      useCase.execute(banner.id, banner.organizationId),
    ).resolves.toEqual(banner);

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
