import { TokenBlacklistService } from '@infrastructure/security';
import { FindUserByIdUseCase } from '@modules/user/use-cases/find-user-by-id.use-case';
import { makeUser } from '@modules/user/use-cases/test-helpers';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenUseCase } from './refresh-token.use-case';

describe('RefreshTokenUseCase', () => {
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let findUserByIdUseCase: jest.Mocked<FindUserByIdUseCase>;
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

    tokenBlacklistService = {
      isRefreshTokenBlacklisted: jest.fn(),
      addRefreshTokenToBlacklist: jest.fn(),
    } as unknown as jest.Mocked<TokenBlacklistService>;

    useCase = new RefreshTokenUseCase(
      jwtService,
      configService,
      findUserByIdUseCase,
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
    findUserByIdUseCase.execute.mockResolvedValue(user);
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

  it('deve lançar UnauthorizedException quando verifyAsync falhar', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    jwtService.verifyAsync.mockRejectedValue(new Error('expired'));

    await expect(useCase.execute('bad-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    consoleSpy.mockRestore();
  });
});
