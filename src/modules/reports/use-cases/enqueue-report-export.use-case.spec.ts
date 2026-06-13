import { EnqueueReportExportUseCase } from './enqueue-report-export.use-case';
import { ReportType } from '../entities';

describe('EnqueueReportExportUseCase', () => {
  let findUserByIdUseCase: { execute: jest.Mock };
  let reportExportQueue: { add: jest.Mock };
  let logger: { info: jest.Mock };
  let useCase: EnqueueReportExportUseCase;

  beforeEach(() => {
    findUserByIdUseCase = {
      execute: jest.fn().mockResolvedValue({
        id: 'user-1',
        name: 'Admin',
        email: 'admin@test.com',
      }),
    };
    reportExportQueue = { add: jest.fn().mockResolvedValue(undefined) };
    logger = { info: jest.fn() };

    useCase = new EnqueueReportExportUseCase(
      findUserByIdUseCase as never,
      reportExportQueue as never,
      logger as never,
    );
  });

  it('deve enfileirar exportação de relatório', async () => {
    const result = await useCase.execute(
      ReportType.MATERIALS_TOP_VIEWS,
      'org-1',
      'user-1',
    );

    expect(result).toEqual({ enqueued: true });
    expect(reportExportQueue.add).toHaveBeenCalledWith(
      'send-export',
      {
        reportType: ReportType.MATERIALS_TOP_VIEWS,
        organizationId: 'org-1',
        userId: 'user-1',
        email: 'admin@test.com',
        name: 'Admin',
      },
      {
        jobId: `${ReportType.MATERIALS_TOP_VIEWS}:org-1:user-1:export`,
      },
    );
  });
});
