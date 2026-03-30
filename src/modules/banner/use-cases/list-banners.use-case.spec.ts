import { BadRequestException } from '@common/filters';
import { BannerRepository } from '../repository';
import { ListBannersUseCase } from './list-banners.use-case';
import { makeBanner } from './test-helpers';

describe('ListBannersUseCase', () => {
  let useCase: ListBannersUseCase;
  let bannerRepository: jest.Mocked<BannerRepository>;

  beforeEach(() => {
    bannerRepository = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<BannerRepository>;

    useCase = new ListBannersUseCase(bannerRepository);
  });

  it('deve retornar a lista do repositório quando não houver data de referência', async () => {
    const banners = [
      makeBanner(),
      makeBanner({ id: 'banner-2', order: 2, name: 'Banner secundário' }),
    ];

    bannerRepository.findAll.mockResolvedValue(banners);

    await expect(useCase.execute('organization-id')).resolves.toEqual(banners);

    expect(bannerRepository.findAll).toHaveBeenCalledWith({
      organizationId: 'organization-id',
      onlyActive: true,
      referenceDate: undefined,
    });
  });

  it('deve converter a data de referência e chamar o repositório com os filtros corretos', async () => {
    const referenceDate = '2024-03-15T12:00:00.000Z';

    bannerRepository.findAll.mockResolvedValue([]);

    await expect(
      useCase.execute('organization-id', referenceDate),
    ).resolves.toEqual([]);

    expect(bannerRepository.findAll).toHaveBeenCalledWith({
      organizationId: 'organization-id',
      onlyActive: true,
      referenceDate: new Date(referenceDate),
    });
    expect(bannerRepository.findAll).toHaveBeenCalledTimes(1);
  });

  it('deve lançar erro quando a data de referência for inválida', async () => {
    const result = useCase.execute('organization-id', 'data-invalida');

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toThrow('Data de referência inválida');

    expect(bannerRepository.findAll).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando bannerRepository.findAll falhar', async () => {
    const error = new Error('Erro ao listar banners');

    bannerRepository.findAll.mockRejectedValue(error);

    await expect(useCase.execute('organization-id')).rejects.toBe(error);
  });
});
