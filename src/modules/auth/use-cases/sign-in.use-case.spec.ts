import { LoginException, NotFoundException } from '@common/filters';
import { CryptographyService } from '@infrastructure/criptography';
import { SecurityLoggerService } from '@infrastructure/security';
import { FindUserByEmailUseCase } from '@modules/user/use-cases/find-user-by-email.use-case';
import { makeUser } from '@modules/user/use-cases/test-helpers';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SignInUseCase } from './sign-in.use-case';
import { makeLoginDTO } from './test-helpers';

describe('SignInUseCase', () => {
  let findUserByEmailUseCase: jest.Mocked<FindUserByEmailUseCase>;
  let jwtService: jest.Mocked<JwtService>;
  let cryptographyService: jest.Mocked<CryptographyService>;
  let securityLogger: jest.Mocked<SecurityLoggerService>;
  let configService: jest.Mocked<ConfigService>;
  let useCase: SignInUseCase;

  beforeEach(() => {
    findUserByEmailUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindUserByEmailUseCase>;

    jwtService = {
      sign: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    cryptographyService = {
      compare: jest.fn(),
    } as unknown as jest.Mocked<CryptographyService>;

    securityLogger = {
      logFailedLogin: jest.fn(),
      logSuccessfulLogin: jest.fn(),
    } as unknown as jest.Mocked<SecurityLoggerService>;

    configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          'jwt.expires': '15m',
          'jwt.refreshExpires': '7d',
          'jwt.refreshSecret': 'refresh-secret',
        };
        return map[key];
      }),
    } as unknown as jest.Mocked<ConfigService>;

    useCase = new SignInUseCase(
      findUserByEmailUseCase,
      jwtService,
      cryptographyService,
      securityLogger,
      configService,
    );
  });

  it('deve retornar access e refresh token quando credenciais forem válidas', async () => {
    const dto = makeLoginDTO();
    const user = makeUser({ email: dto.email, password: 'stored-hash' });

    findUserByEmailUseCase.execute.mockResolvedValue(user);
    cryptographyService.compare.mockResolvedValue(true);
    jwtService.sign
      .mockReturnValueOnce('access-jwt')
      .mockReturnValueOnce('refresh-jwt');

    const result = await useCase.execute(
      dto,
      '192.168.1.1',
      'jest-agent',
    );

    expect(result).toEqual({
      accessToken: 'access-jwt',
      refreshToken: 'refresh-jwt',
    });
    expect(cryptographyService.compare).toHaveBeenCalledWith(
      dto.password,
      user.password,
    );
    expect(securityLogger.logSuccessfulLogin).toHaveBeenCalledWith(
      user.id,
      user.email,
      '192.168.1.1',
      'jest-agent',
    );
    expect(securityLogger.logFailedLogin).not.toHaveBeenCalled();
    expect(jwtService.sign).toHaveBeenCalledTimes(2);
  });

  it('deve lançar LoginException quando a senha estiver incorreta', async () => {
    const dto = makeLoginDTO();
    const user = makeUser({ email: dto.email });

    findUserByEmailUseCase.execute.mockResolvedValue(user);
    cryptographyService.compare.mockResolvedValue(false);

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(LoginException);

    expect(securityLogger.logFailedLogin).toHaveBeenCalledWith(
      dto.email,
      'unknown',
      undefined,
      'Credenciais inválidas',
    );
    expect(securityLogger.logSuccessfulLogin).not.toHaveBeenCalled();
  });

  it('deve propagar NotFoundException quando o email não existir', async () => {
    const dto = makeLoginDTO();

    findUserByEmailUseCase.execute.mockRejectedValue(
      new NotFoundException('Usuário não encontrado'),
    );

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(cryptographyService.compare).not.toHaveBeenCalled();
    expect(securityLogger.logSuccessfulLogin).not.toHaveBeenCalled();
  });

  it('deve comparar com hash dummy quando usuário for null (timing)', async () => {
    const dto = makeLoginDTO();
    findUserByEmailUseCase.execute.mockResolvedValue(null as never);
    cryptographyService.compare.mockResolvedValue(false);

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(LoginException);

    expect(cryptographyService.compare).toHaveBeenCalledWith(
      dto.password,
      expect.stringContaining('$2b$10$dummy'),
    );
  });
});
