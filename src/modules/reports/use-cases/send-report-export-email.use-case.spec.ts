import { ReportType } from '../entities';
import { SendReportExportEmailUseCase } from './send-report-export-email.use-case';

describe('SendReportExportEmailUseCase', () => {
  let exportReportUseCase: { execute: jest.Mock };
  let mailService: { sendMail: jest.Mock };
  let logger: { info: jest.Mock };
  let useCase: SendReportExportEmailUseCase;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    exportReportUseCase = {
      execute: jest.fn().mockResolvedValue({
        filename: 'relatorio.csv',
        content: 'nome,email\nAna,ana@test.com',
      }),
    };
    mailService = { sendMail: jest.fn().mockResolvedValue(undefined) };
    logger = { info: jest.fn() };

    useCase = new SendReportExportEmailUseCase(
      exportReportUseCase as never,
      mailService as never,
      logger as never,
    );
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('deve enviar e-mail em produção', async () => {
    process.env.NODE_ENV = 'prod';

    await useCase.execute({
      reportType: ReportType.USERS_TOP_LOGINS,
      organizationId: 'org-1',
      userId: 'user-1',
      email: 'admin@test.com',
      name: 'Admin',
    });

    expect(mailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@test.com',
        template: 'report-export',
        attachments: [
          expect.objectContaining({
            filename: 'relatorio.csv',
          }),
        ],
      }),
    );
  });

  it('deve apenas logar fora de produção', async () => {
    process.env.NODE_ENV = 'dev';

    await useCase.execute({
      reportType: ReportType.USERS_TOP_DOWNLOADS,
      organizationId: 'org-1',
      userId: 'user-1',
      email: 'admin@test.com',
      name: 'Admin',
    });

    expect(mailService.sendMail).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalled();
  });
});
