import { TokenBlacklistService } from '@infrastructure/security';
import { FindUserBackofficeAccessUseCase } from '@modules/roles';
import { FindUserByIdUseCase } from '@modules/user/use-cases/find-user-by-id.use-case';
import { RecordUserPlatformLoginUseCase } from '@modules/user/use-cases/record-user-platform-login.use-case';
import { makeUser } from '@modules/user/use-cases/test-helpers';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenUseCase } from './refresh-token.use-case';

describe('RefreshTokenUseCase', () => {
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let findUserByIdUseCase: jest.Mocked<FindUserByIdUseCase>;
  let findUserBackofficeAccessUseCase: jest.Mocked<FindUserBackofficeAccessUseCase>;
  let recordUserPlatformLoginUseCase: jest.Mocked<RecordUserPlatformLoginUseCase>;
  let tokenBlacklistService: jest.Mocked<TokenBlacklistService>;
  let useCase: RefreshTokenUseCase;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
      sign: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'jwt.refreshSecret') return 'refresh-secret';
        if (key === 'jwt.expires') return '15m';
        if (key === 'jwt.refreshExpires') return '7d';
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    findUserByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindUserByIdUseCase>;

    findUserBackofficeAccessUseCase = {
      execute: jest.fn().mockResolvedValue({ canAccessBackoffice: true }),
    } as unknown as jest.Mocked<FindUserBackofficeAccessUseCase>;

    recordUserPlatformLoginUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RecordUserPlatformLoginUseCase>;

    tokenBlacklistService = {
      isRefreshTokenBlacklisted: jest.fn(),
      addRefreshTokenToBlacklist: jest.fn(),
    } as unknown as jest.Mocked<TokenBlacklistService>;

    useCase = new RefreshTokenUseCase(
      jwtService,
      configService,
      findUserByIdUseCase,
      findUserBackofficeAccessUseCase,
      recordUserPlatformLoginUseCase,
      tokenBlacklistService,
    );
  });

  it('deve emitir novos tokens e colocar o refresh antigo na blacklist', async () => {
    const user = makeUser();
    const refreshToken = 'incoming-refresh';

    jwtService.verifyAsync.mockResolvedValue({
      id: user.id,
      jti: 'old-jti',
    });
    tokenBlacklistService.isRefreshTokenBlacklisted.mockResolvedValue(false);
    findUserByIdUseCase.execute.mockResolvedValue({ id: user.id } as never);
    jwtService.sign
      .mockReturnValueOnce('new-access')
      .mockReturnValueOnce('new-refresh');

    const result = await useCase.execute(refreshToken);

    expect(result).toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
    expect(jwtService.verifyAsync).toHaveBeenCalledWith(refreshToken, {
      secret: 'refresh-secret',
    });
    expect(tokenBlacklistService.isRefreshTokenBlacklisted).toHaveBeenCalledWith(
      'old-jti',
    );
    expect(tokenBlacklistService.addRefreshTokenToBlacklist).toHaveBeenCalledWith(
      'old-jti',
    );
    expect(jwtService.sign).toHaveBeenCalledTimes(2);
    expect(recordUserPlatformLoginUseCase.execute).not.toHaveBeenCalled();
  });

  it('deve registrar refresh para usuário comum', async () => {
    const user = makeUser();
    const refreshToken = 'incoming-refresh';

    jwtService.verifyAsync.mockResolvedValue({
      id: user.id,
      jti: 'old-jti',
    });
    tokenBlacklistService.isRefreshTokenBlacklisted.mockResolvedValue(false);
    findUserByIdUseCase.execute.mockResolvedValue({ id: user.id } as never);
    findUserBackofficeAccessUseCase.execute.mockResolvedValue({
      canAccessBackoffice: false,
    });
    jwtService.sign
      .mockReturnValueOnce('new-access')
      .mockReturnValueOnce('new-refresh');

    await useCase.execute(refreshToken);

    expect(recordUserPlatformLoginUseCase.execute).toHaveBeenCalledWith(
      user.id,
      'refresh',
    );
  });

  it('deve concluir refresh mesmo quando registro de plataforma falhar', async () => {
    const user = makeUser();

    jwtService.verifyAsync.mockResolvedValue({ id: user.id, jti: 'jti' });
    tokenBlacklistService.isRefreshTokenBlacklisted.mockResolvedValue(false);
    findUserByIdUseCase.execute.mockResolvedValue({ id: user.id } as never);
    findUserBackofficeAccessUseCase.execute.mockResolvedValue({
      canAccessBackoffice: false,
    });
    recordUserPlatformLoginUseCase.execute.mockRejectedValue(
      new Error('db down'),
    );
    jwtService.sign
      .mockReturnValueOnce('access')
      .mockReturnValueOnce('refresh');

    await expect(useCase.execute('token')).resolves.toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
    });
  });

  it('deve lançar UnauthorizedException quando o refresh estiver revogado', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    jwtService.verifyAsync.mockResolvedValue({ id: 'u1', jti: 'revoked' });
    tokenBlacklistService.isRefreshTokenBlacklisted.mockResolvedValue(true);

    await expect(useCase.execute('token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(findUserByIdUseCase.execute).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('deve renovar tokens sem blacklist quando payload não tiver jti', async () => {
    const user = makeUser();
    jwtService.verifyAsync.mockResolvedValue({ id: user.id });
    findUserByIdUseCase.execute.mockResolvedValue({ id: user.id } as never);
    jwtService.sign
      .mockReturnValueOnce('access')
      .mockReturnValueOnce('refresh');

    const result = await useCase.execute('token-sem-jti');

    expect(result.accessToken).toBe('access');
    expect(tokenBlacklistService.isRefreshTokenBlacklisted).not.toHaveBeenCalled();
    expect(tokenBlacklistService.addRefreshTokenToBlacklist).not.toHaveBeenCalled();
  });

  it('deve lançar UnauthorizedException quando verifyAsync falhar', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    jwtService.verifyAsync.mockRejectedValue(new Error('expired'));

    await expect(useCase.execute('bad-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    consoleSpy.mockRestore();
  });
});
