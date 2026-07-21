import { ReportRepository } from '../repository';
import { FindTopUsersByMaterialDownloadsUseCase } from './find-top-users-by-material-downloads.use-case';

describe('FindTopUsersByMaterialDownloadsUseCase', () => {
  let reportRepository: jest.Mocked<
    Pick<ReportRepository, 'findTopUsersByMaterialDownloads'>
  >;
  let useCase: FindTopUsersByMaterialDownloadsUseCase;

  beforeEach(() => {
    reportRepository = {
      findTopUsersByMaterialDownloads: jest.fn(),
    };

    useCase = new FindTopUsersByMaterialDownloadsUseCase(
      reportRepository as unknown as ReportRepository,
    );
  });

  it('deve delegar a busca para o repositório com os filtros informados', async () => {
    const paginated = { data: [], total: 0, totalPages: 0, page: 2 };
    reportRepository.findTopUsersByMaterialDownloads.mockResolvedValue(
      paginated,
    );

    await expect(
      useCase.execute('org-1', { page: 2, limit: 10 }),
    ).resolves.toEqual(paginated);

    expect(
      reportRepository.findTopUsersByMaterialDownloads,
    ).toHaveBeenCalledWith('org-1', { page: 2, limit: 10 });
  });

  it('deve usar filtros vazios quando não informados', async () => {
    const paginated = { data: [], total: 0, totalPages: 0, page: 1 };
    reportRepository.findTopUsersByMaterialDownloads.mockResolvedValue(
      paginated,
    );

    await expect(useCase.execute('org-1')).resolves.toEqual(paginated);

    expect(
      reportRepository.findTopUsersByMaterialDownloads,
    ).toHaveBeenCalledWith('org-1', {});
  });
});
