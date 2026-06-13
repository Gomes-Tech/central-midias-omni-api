import { ReportType } from '../entities';
import { ExportReportUseCase } from './export-report.use-case';

describe('ExportReportUseCase', () => {
  let reportRepository: {
    findAllTopUsersByPlatformLogins: jest.Mock;
    findAllTopUsersByMaterialDownloads: jest.Mock;
    findAllTopMaterialsByViews: jest.Mock;
    findAllTopMaterialsByDownloads: jest.Mock;
  };
  let useCase: ExportReportUseCase;

  beforeEach(() => {
    reportRepository = {
      findAllTopUsersByPlatformLogins: jest.fn().mockResolvedValue([
        {
          userId: 'user-1',
          name: 'Ana',
          email: 'ana@test.com',
          loginCount: 2,
          lastLoginAt: null,
        },
      ]),
      findAllTopUsersByMaterialDownloads: jest.fn().mockResolvedValue([]),
      findAllTopMaterialsByViews: jest.fn().mockResolvedValue([]),
      findAllTopMaterialsByDownloads: jest.fn().mockResolvedValue([]),
    };

    useCase = new ExportReportUseCase(reportRepository as never);
  });

  it('deve exportar CSV de usuários por login', async () => {
    const result = await useCase.execute(
      ReportType.USERS_TOP_LOGINS,
      'org-1',
    );

    expect(result.filename).toBe('relatorio-usuarios-logins.csv');
    expect(result.content).toContain('Ana');
    expect(reportRepository.findAllTopUsersByPlatformLogins).toHaveBeenCalledWith(
      'org-1',
    );
  });
});
