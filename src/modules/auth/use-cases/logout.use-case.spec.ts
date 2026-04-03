import { TokenBlacklistService } from '@infrastructure/security';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LogoutUserUseCase } from './logout.use-case';

describe('LogoutUserUseCase', () => {
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let tokenBlacklistService: jest.Mocked<TokenBlacklistService>;
  let useCase: LogoutUserUseCase;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn().mockReturnValue('refresh-secret'),
    } as unknown as jest.Mocked<ConfigService>;

    tokenBlacklistService = {
      addToBlacklist: jest.fn(),
      addRefreshTokenToBlacklist: jest.fn(),
    } as unknown as jest.Mocked<TokenBlacklistService>;

    useCase = new LogoutUserUseCase(
      jwtService,
      configService,
      tokenBlacklistService,
    );
  });

  it('deve colocar o access token na blacklist quando houver jti', async () => {
    jwtService.verifyAsync.mockResolvedValue({ jti: 'access-jti' });

    await expect(
      useCase.execute('access-token-raw', undefined),
    ).resolves.toBeUndefined();

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('access-token-raw');
    expect(tokenBlacklistService.addToBlacklist).toHaveBeenCalledWith(
      'access-jti',
    );
    expect(tokenBlacklistService.addRefreshTokenToBlacklist).not.toHaveBeenCalled();
  });

  it('deve colocar o refresh token na blacklist quando houver jti', async () => {
    jwtService.verifyAsync.mockResolvedValue({ jti: 'refresh-jti' });

    await expect(useCase.execute(undefined, 'refresh-token-raw')).resolves.toBeUndefined();

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('refresh-token-raw', {
      secret: 'refresh-secret',
    });
    expect(tokenBlacklistService.addRefreshTokenToBlacklist).toHaveBeenCalledWith(
      'refresh-jti',
    );
    expect(tokenBlacklistService.addToBlacklist).not.toHaveBeenCalled();
  });

  it('não deve falhar quando não houver tokens', async () => {
    await expect(useCase.execute(undefined, undefined)).resolves.toBeUndefined();
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });
});
