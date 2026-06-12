import { BadRequestException } from '@common/filters';
import { SocialHighlightRepository } from '../repository';
import { FindAllSocialHighlightsUseCase } from './find-all-social-highlights.use-case';
import { makeSocialHighlight } from './test-helpers';

describe('FindAllSocialHighlightsUseCase', () => {
  let useCase: FindAllSocialHighlightsUseCase;
  let socialHighlightRepository: jest.Mocked<SocialHighlightRepository>;

  beforeEach(() => {
    socialHighlightRepository = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<SocialHighlightRepository>;

    useCase = new FindAllSocialHighlightsUseCase(socialHighlightRepository);
  });

  it('deve retornar a lista do repositório quando não houver filtros de data', async () => {
    const paginated = {
      data: [
        makeSocialHighlight(),
        makeSocialHighlight({ id: 'social-highlight-2', order: 2, name: 'Destaque secundário' }),
      ],
      total: 2,
      page: 1,
      totalPages: 1,
    };

    socialHighlightRepository.findAll.mockResolvedValue(paginated);

    await expect(useCase.execute('organization-id')).resolves.toEqual(
      paginated,
    );

    expect(socialHighlightRepository.findAll).toHaveBeenCalledWith(
      {},
      'organization-id',
    );
  });

  it('deve converter as datas e chamar o repositório com os filtros corretos', async () => {
    const initialDate = '2024-03-01T00:00:00.000Z';
    const finishDate = '2024-03-15T12:00:00.000Z';
    const emptyPaginated = { data: [], total: 0, page: 1, totalPages: 0 };

    socialHighlightRepository.findAll.mockResolvedValue(emptyPaginated);

    await expect(
      useCase.execute('organization-id', {
        initialDate: new Date(initialDate),
        finishDate: new Date(finishDate),
        page: 1,
      }),
    ).resolves.toEqual(emptyPaginated);

    expect(socialHighlightRepository.findAll).toHaveBeenCalledWith(
      {
        initialDate: new Date(initialDate),
        finishDate: new Date(finishDate),
        page: 1,
      },
      'organization-id',
    );
    expect(socialHighlightRepository.findAll).toHaveBeenCalledTimes(1);
  });

  it('deve lançar erro quando a data inicial for inválida', async () => {
    const result = useCase.execute('organization-id', {
      initialDate: 'data-invalida' as unknown as Date,
    });

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toThrow('Data inicial inválida');

    expect(socialHighlightRepository.findAll).not.toHaveBeenCalled();
  });

  it('deve lançar erro quando a data final for inválida', async () => {
    const result = useCase.execute('organization-id', {
      finishDate: 'data-invalida' as unknown as Date,
    });

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toThrow('Data final inválida');

    expect(socialHighlightRepository.findAll).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando socialHighlightRepository.findAll falhar', async () => {
    const error = new Error('Erro ao listar banners');

    socialHighlightRepository.findAll.mockRejectedValue(error);

    await expect(useCase.execute('organization-id')).rejects.toBe(error);
  });
});
