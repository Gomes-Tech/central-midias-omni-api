import { ReportRepository } from '../repository';
import { FindTopUsersByPlatformLoginsUseCase } from './find-top-users-by-platform-logins.use-case';

describe('FindTopUsersByPlatformLoginsUseCase', () => {
  let reportRepository: jest.Mocked<
    Pick<ReportRepository, 'findTopUsersByPlatformLogins'>
  >;
  let useCase: FindTopUsersByPlatformLoginsUseCase;

  beforeEach(() => {
    reportRepository = {
      findTopUsersByPlatformLogins: jest.fn(),
    };

    useCase = new FindTopUsersByPlatformLoginsUseCase(
      reportRepository as unknown as ReportRepository,
    );
  });

  it('deve delegar a busca para o repositório com os filtros informados', async () => {
    const paginated = { data: [], total: 0, totalPages: 0, page: 2 };
    reportRepository.findTopUsersByPlatformLogins.mockResolvedValue(
      paginated,
    );

    await expect(
      useCase.execute('org-1', { page: 2, limit: 10 }),
    ).resolves.toEqual(paginated);

    expect(
      reportRepository.findTopUsersByPlatformLogins,
    ).toHaveBeenCalledWith('org-1', { page: 2, limit: 10 });
  });

  it('deve usar filtros vazios quando não informados', async () => {
    const paginated = { data: [], total: 0, totalPages: 0, page: 1 };
    reportRepository.findTopUsersByPlatformLogins.mockResolvedValue(
      paginated,
    );

    await expect(useCase.execute('org-1')).resolves.toEqual(paginated);

    expect(
      reportRepository.findTopUsersByPlatformLogins,
    ).toHaveBeenCalledWith('org-1', {});
  });
});
