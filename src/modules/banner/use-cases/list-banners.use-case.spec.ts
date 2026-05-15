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

  it('deve retornar a lista do repositório quando não houver filtros de data', async () => {
    const paginated = {
      data: [
        makeBanner(),
        makeBanner({ id: 'banner-2', order: 2, name: 'Banner secundário' }),
      ],
      total: 2,
      page: 1,
      totalPages: 1,
    };

    bannerRepository.findAll.mockResolvedValue(paginated);

    await expect(useCase.execute('organization-id')).resolves.toEqual(
      paginated,
    );

    expect(bannerRepository.findAll).toHaveBeenCalledWith(
      {},
      'organization-id',
    );
  });

  it('deve converter as datas e chamar o repositório com os filtros corretos', async () => {
    const initialDate = '2024-03-01T00:00:00.000Z';
    const finishDate = '2024-03-15T12:00:00.000Z';
    const emptyPaginated = { data: [], total: 0, page: 1, totalPages: 0 };

    bannerRepository.findAll.mockResolvedValue(emptyPaginated);

    await expect(
      useCase.execute('organization-id', {
        initialDate: new Date(initialDate),
        finishDate: new Date(finishDate),
        page: 1,
      }),
    ).resolves.toEqual(emptyPaginated);

    expect(bannerRepository.findAll).toHaveBeenCalledWith(
      {
        initialDate: new Date(initialDate),
        finishDate: new Date(finishDate),
        page: 1,
      },
      'organization-id',
    );
    expect(bannerRepository.findAll).toHaveBeenCalledTimes(1);
  });

  it('deve lançar erro quando a data inicial for inválida', async () => {
    const result = useCase.execute('organization-id', {
      initialDate: 'data-invalida' as unknown as Date,
    });

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toThrow('Data inicial inválida');

    expect(bannerRepository.findAll).not.toHaveBeenCalled();
  });

  it('deve lançar erro quando a data final for inválida', async () => {
    const result = useCase.execute('organization-id', {
      finishDate: 'data-invalida' as unknown as Date,
    });

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toThrow('Data final inválida');

    expect(bannerRepository.findAll).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando bannerRepository.findAll falhar', async () => {
    const error = new Error('Erro ao listar banners');

    bannerRepository.findAll.mockRejectedValue(error);

    await expect(useCase.execute('organization-id')).rejects.toBe(error);
  });
});
