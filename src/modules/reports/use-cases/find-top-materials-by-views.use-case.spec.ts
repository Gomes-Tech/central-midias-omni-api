import { ReportRepository } from '../repository';
import { FindTopMaterialsByViewsUseCase } from './find-top-materials-by-views.use-case';

describe('FindTopMaterialsByViewsUseCase', () => {
  let reportRepository: jest.Mocked<
    Pick<ReportRepository, 'findTopMaterialsByViews'>
  >;
  let useCase: FindTopMaterialsByViewsUseCase;

  beforeEach(() => {
    reportRepository = {
      findTopMaterialsByViews: jest.fn(),
    };

    useCase = new FindTopMaterialsByViewsUseCase(
      reportRepository as unknown as ReportRepository,
    );
  });

  it('deve delegar a busca para o repositório com os filtros informados', async () => {
    const paginated = { data: [], total: 0, totalPages: 0, page: 2 };
    reportRepository.findTopMaterialsByViews.mockResolvedValue(paginated);

    await expect(
      useCase.execute('org-1', { page: 2, limit: 10 }),
    ).resolves.toEqual(paginated);

    expect(reportRepository.findTopMaterialsByViews).toHaveBeenCalledWith(
      'org-1',
      { page: 2, limit: 10 },
    );
  });

  it('deve usar filtros vazios quando não informados', async () => {
    const paginated = { data: [], total: 0, totalPages: 0, page: 1 };
    reportRepository.findTopMaterialsByViews.mockResolvedValue(paginated);

    await expect(useCase.execute('org-1')).resolves.toEqual(paginated);

    expect(reportRepository.findTopMaterialsByViews).toHaveBeenCalledWith(
      'org-1',
      {},
    );
  });
});
