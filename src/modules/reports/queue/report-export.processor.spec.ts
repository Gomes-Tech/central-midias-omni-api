import { REPORT_EXPORT_JOB } from '@infrastructure/queue';
import { ReportExportProcessor } from './report-export.processor';
import { ReportType } from '../entities';

describe('ReportExportProcessor', () => {
  it('deve delegar job de exportação para o use case de e-mail', async () => {
    const sendReportExportEmailUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    const processor = new ReportExportProcessor(
      sendReportExportEmailUseCase as never,
    );

    const payload = {
      reportType: ReportType.MATERIALS_TOP_DOWNLOADS,
      organizationId: 'org-1',
      userId: 'user-1',
      email: 'admin@test.com',
      name: 'Admin',
    };

    await processor.process({
      name: REPORT_EXPORT_JOB,
      data: payload,
    } as never);

    expect(sendReportExportEmailUseCase.execute).toHaveBeenCalledWith(payload);
  });

  it('deve ignorar jobs com nome diferente', async () => {
    const sendReportExportEmailUseCase = {
      execute: jest.fn(),
    };

    const processor = new ReportExportProcessor(
      sendReportExportEmailUseCase as never,
    );

    await processor.process({
      name: 'other-job',
      data: {},
    } as never);

    expect(sendReportExportEmailUseCase.execute).not.toHaveBeenCalled();
  });
});
