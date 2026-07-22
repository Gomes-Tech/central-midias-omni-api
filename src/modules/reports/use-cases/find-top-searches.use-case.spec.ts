import { ReportRepository } from '../repository';
import { FindTopSearchesUseCase } from './find-top-searches.use-case';

describe('FindTopSearchesUseCase', () => {
  let reportRepository: jest.Mocked<Pick<ReportRepository, 'findTopSearches'>>;
  let useCase: FindTopSearchesUseCase;

  beforeEach(() => {
    reportRepository = {
      findTopSearches: jest.fn(),
    };

    useCase = new FindTopSearchesUseCase(
      reportRepository as unknown as ReportRepository,
    );
  });

  it('deve delegar a busca para o repositório com os filtros informados', async () => {
    const paginated = {
      data: [
        {
          term: 'bola',
          search: 'bola',
          tag: 'bola',
          quantity: 51,
        },
      ],
      total: 1,
      totalPages: 1,
      page: 2,
    };
    reportRepository.findTopSearches.mockResolvedValue(paginated);

    await expect(
      useCase.execute('org-1', { page: 2, limit: 10 }),
    ).resolves.toEqual(paginated);

    expect(reportRepository.findTopSearches).toHaveBeenCalledWith('org-1', {
      page: 2,
      limit: 10,
    });
  });

  it('deve usar filtros vazios quando não informados', async () => {
    const paginated = { data: [], total: 0, totalPages: 0, page: 1 };
    reportRepository.findTopSearches.mockResolvedValue(paginated);

    await expect(useCase.execute('org-1')).resolves.toEqual(paginated);

    expect(reportRepository.findTopSearches).toHaveBeenCalledWith('org-1', {});
  });
});
