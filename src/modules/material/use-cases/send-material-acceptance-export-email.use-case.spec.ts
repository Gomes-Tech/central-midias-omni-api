import { LoggerService } from '@infrastructure/log';
import { MailService } from '@infrastructure/providers';
import { ExportMaterialAcceptanceReportUseCase } from './export-material-acceptance-report.use-case';
import { SendMaterialAcceptanceExportEmailUseCase } from './send-material-acceptance-export-email.use-case';

describe('SendMaterialAcceptanceExportEmailUseCase', () => {
  let exportMaterialAcceptanceReportUseCase: { execute: jest.Mock };
  let mailService: { sendMail: jest.Mock };
  let logger: { info: jest.Mock };
  let useCase: SendMaterialAcceptanceExportEmailUseCase;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    exportMaterialAcceptanceReportUseCase = {
      execute: jest.fn().mockResolvedValue({
        filename: 'material-aceite-manual.csv',
        content: 'nome,email,visualizou,data_aceite',
      }),
    };
    mailService = { sendMail: jest.fn().mockResolvedValue(undefined) };
    logger = { info: jest.fn() };
    useCase = new SendMaterialAcceptanceExportEmailUseCase(
      exportMaterialAcceptanceReportUseCase as unknown as ExportMaterialAcceptanceReportUseCase,
      mailService as unknown as MailService,
      logger as unknown as LoggerService,
    );
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('deve enviar e-mail com csv anexo em produção', async () => {
    process.env.NODE_ENV = 'prod';

    await useCase.execute({
      materialId: 'material-id',
      organizationId: 'org-id',
      userId: 'user-id',
      email: 'joao@teste.com',
      name: 'João',
    });

    expect(exportMaterialAcceptanceReportUseCase.execute).toHaveBeenCalledWith(
      'material-id',
      'org-id',
    );
    expect(mailService.sendMail).toHaveBeenCalledWith({
      to: 'joao@teste.com',
      subject: 'Relatório de aceite de material',
      template: 'material-acceptance-export',
      context: {
        name: 'João',
        filename: 'material-aceite-manual.csv',
      },
      attachments: [
        {
          filename: 'material-aceite-manual.csv',
          content: 'nome,email,visualizou,data_aceite',
          contentType: 'text/csv; charset=utf-8',
        },
      ],
    });
  });

  it('deve apenas logar em desenvolvimento', async () => {
    process.env.NODE_ENV = 'dev';

    await useCase.execute({
      materialId: 'material-id',
      organizationId: 'org-id',
      userId: 'user-id',
      email: 'joao@teste.com',
      name: 'João',
    });

    expect(mailService.sendMail).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalled();
  });
});
