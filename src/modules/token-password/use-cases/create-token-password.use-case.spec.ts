import { CryptographyService } from '@infrastructure/criptography';
import { MailService } from '@infrastructure/providers';
import { TokenPasswordRepository } from '../repository';
import { CreateTokenPasswordUseCase } from './create-token-password.use-case';

describe('CreateTokenPasswordUseCase', () => {
  let useCase: CreateTokenPasswordUseCase;
  let repository: jest.Mocked<Pick<TokenPasswordRepository, 'createToken'>>;
  let cryptographyService: jest.Mocked<CryptographyService>;
  let mailService: jest.Mocked<MailService>;

  beforeEach(() => {
    repository = {
      createToken: jest.fn().mockResolvedValue(undefined),
    };

    cryptographyService = {
      hash: jest
        .fn()
        .mockImplementation((plain: string) =>
          Promise.resolve(`hashed:${plain}`),
        ),
    } as unknown as jest.Mocked<CryptographyService>;

    mailService = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MailService>;

    useCase = new CreateTokenPasswordUseCase(
      repository as unknown as TokenPasswordRepository,
      cryptographyService,
      mailService,
    );
  });

  it('deve gerar token, hashear e persistir sem enviar email fora de prod', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    try {
      await useCase.execute('a@b.com');

      expect(cryptographyService.hash).toHaveBeenCalledWith(
        expect.stringMatching(/^[A-Z0-9]{6}$/),
      );
      const plain = cryptographyService.hash.mock.calls[0][0] as string;
      expect(repository.createToken).toHaveBeenCalledWith({
        email: 'a@b.com',
        token: `hashed:${plain}`,
      });
      expect(mailService.sendMail).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('deve enviar email em prod com link e contexto', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalFront = process.env.FRONTEND_URL;
    const originalExp = process.env.TOKEN_PASSWORD_EXPIRES_MINUTES;
    process.env.NODE_ENV = 'prod';
    process.env.FRONTEND_URL = 'https://app.example.com/';
    process.env.TOKEN_PASSWORD_EXPIRES_MINUTES = '30';

    try {
      await useCase.execute('user@test.com');

      expect(mailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: 'Recuperação de senha',
          template: 'reset-password',
          context: expect.objectContaining({
            token: expect.stringMatching(/^[A-Z0-9]{6}$/),
            resetLink: 'https://app.example.com/reset-password',
            expiresAt: '30',
          }),
        }),
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.FRONTEND_URL = originalFront;
      process.env.TOKEN_PASSWORD_EXPIRES_MINUTES = originalExp;
    }
  });

  it('deve omitir resetLink quando FRONTEND_URL estiver vazio', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalFront = process.env.FRONTEND_URL;
    process.env.NODE_ENV = 'prod';
    delete process.env.FRONTEND_URL;

    try {
      await useCase.execute('u@test.com');

      expect(mailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            resetLink: undefined,
            token: expect.stringMatching(/^[A-Z0-9]{6}$/),
          }),
        }),
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalFront !== undefined) {
        process.env.FRONTEND_URL = originalFront;
      }
    }
  });

  it('deve usar 15 como expiresAt padrão quando TOKEN_PASSWORD_EXPIRES_MINUTES não estiver definido', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalExp = process.env.TOKEN_PASSWORD_EXPIRES_MINUTES;
    const originalFront = process.env.FRONTEND_URL;
    process.env.NODE_ENV = 'prod';
    process.env.FRONTEND_URL = 'https://app.example.com';
    delete process.env.TOKEN_PASSWORD_EXPIRES_MINUTES;

    try {
      await useCase.execute('u@test.com');

      expect(mailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            expiresAt: 15,
          }),
        }),
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalExp !== undefined) {
        process.env.TOKEN_PASSWORD_EXPIRES_MINUTES = originalExp;
      } else {
        delete process.env.TOKEN_PASSWORD_EXPIRES_MINUTES;
      }
      if (originalFront !== undefined) {
        process.env.FRONTEND_URL = originalFront;
      } else {
        delete process.env.FRONTEND_URL;
      }
    }
  });
});
