import { LoggerService } from '@infrastructure/log';
import { MailService } from '@infrastructure/providers';
import { SendMaterialNotificationEmailUseCase } from './send-material-notification-email.use-case';

describe('SendMaterialNotificationEmailUseCase', () => {
  let mailService: { sendMail: jest.Mock };
  let logger: { info: jest.Mock };
  let useCase: SendMaterialNotificationEmailUseCase;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mailService = { sendMail: jest.fn().mockResolvedValue(undefined) };
    logger = { info: jest.fn() };
    useCase = new SendMaterialNotificationEmailUseCase(
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
      subject: 'Novo material: Manual',
      template: 'material-notification',
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
