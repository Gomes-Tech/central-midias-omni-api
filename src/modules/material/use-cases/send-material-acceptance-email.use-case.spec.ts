import { LoggerService } from '@infrastructure/log';
import { MailService } from '@infrastructure/providers';
import { SendMaterialAcceptanceEmailUseCase } from './send-material-acceptance-email.use-case';

describe('SendMaterialAcceptanceEmailUseCase', () => {
  let mailService: { sendMail: jest.Mock };
  let logger: { info: jest.Mock };
  let useCase: SendMaterialAcceptanceEmailUseCase;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mailService = { sendMail: jest.fn().mockResolvedValue(undefined) };
    logger = { info: jest.fn() };
    useCase = new SendMaterialAcceptanceEmailUseCase(
      mailService as unknown as MailService,
      logger as unknown as LoggerService,
    );
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('deve enviar e-mail em produção', async () => {
    process.env.NODE_ENV = 'prod';

    await useCase.execute({
      materialId: 'material-id',
      organizationId: 'org-id',
      userId: 'user-id',
      email: 'joao@teste.com',
      name: 'João',
      materialName: 'Manual',
      materialLink: 'https://app.test/materials/material-id',
    });

    expect(mailService.sendMail).toHaveBeenCalledWith({
      to: 'joao@teste.com',
      subject: 'Confirmação de leitura: Manual',
      template: 'material-acceptance',
      context: {
        name: 'João',
        materialName: 'Manual',
        materialLink: 'https://app.test/materials/material-id',
      },
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
      materialName: 'Manual',
    });

    expect(mailService.sendMail).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalled();
  });
});
