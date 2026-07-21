import { ReportRepository } from '../repository';
import { FindTopMaterialsByDownloadsUseCase } from './find-top-materials-by-downloads.use-case';

describe('FindTopMaterialsByDownloadsUseCase', () => {
  let reportRepository: jest.Mocked<
    Pick<ReportRepository, 'findTopMaterialsByDownloads'>
  >;
  let useCase: FindTopMaterialsByDownloadsUseCase;

  beforeEach(() => {
    reportRepository = {
      findTopMaterialsByDownloads: jest.fn(),
    };

    useCase = new FindTopMaterialsByDownloadsUseCase(
      reportRepository as unknown as ReportRepository,
    );
  });

  it('deve delegar a busca para o repositório com os filtros informados', async () => {
    const paginated = { data: [], total: 0, totalPages: 0, page: 2 };
    reportRepository.findTopMaterialsByDownloads.mockResolvedValue(paginated);

    await expect(
      useCase.execute('org-1', { page: 2, limit: 10 }),
    ).resolves.toEqual(paginated);

    expect(reportRepository.findTopMaterialsByDownloads).toHaveBeenCalledWith(
      'org-1',
      { page: 2, limit: 10 },
    );
  });

  it('deve usar filtros vazios quando não informados', async () => {
    const paginated = { data: [], total: 0, totalPages: 0, page: 1 };
    reportRepository.findTopMaterialsByDownloads.mockResolvedValue(paginated);

    await expect(useCase.execute('org-1')).resolves.toEqual(paginated);

    expect(reportRepository.findTopMaterialsByDownloads).toHaveBeenCalledWith(
      'org-1',
      {},
    );
  });
});
