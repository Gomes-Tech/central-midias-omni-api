import { ConfigService } from '@nestjs/config';
import { TokenBlacklistService } from './token-blacklist.service';

describe('TokenBlacklistService', () => {
  let redis: {
    set: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
  };
  let configGet: jest.Mock;
  let service: TokenBlacklistService;

  beforeEach(() => {
    redis = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
    };
    configGet = jest.fn((key: string) => {
      if (key === 'jwt.expires') return '15m';
      if (key === 'jwt.refreshExpires') return '7d';
      return undefined;
    });
    service = new TokenBlacklistService(
      redis as never,
      { get: configGet } as unknown as ConfigService,
    );
  });

  it('addToBlacklist deve gravar no Redis com prefixo e TTL em segundos', async () => {
    await service.addToBlacklist('jti-1');

    expect(redis.set).toHaveBeenCalledWith(
      'blacklist:token:jti-1',
      '1',
      'EX',
      15 * 60,
    );
  });

  it('addRefreshTokenToBlacklist deve usar refresh TTL', async () => {
    await service.addRefreshTokenToBlacklist('r1');

    expect(redis.set).toHaveBeenCalledWith(
      'blacklist:refresh:r1',
      '1',
      'EX',
      7 * 24 * 60 * 60,
    );
  });

  it('isTokenBlacklisted deve retornar true quando existir entrada', async () => {
    redis.get.mockResolvedValue('1');

    await expect(service.isTokenBlacklisted('x')).resolves.toBe(true);
  });

  it('isTokenBlacklisted deve retornar false quando não existir entrada', async () => {
    redis.get.mockResolvedValue(null);

    await expect(service.isTokenBlacklisted('x')).resolves.toBe(false);
  });

  it('isTokenBlacklisted deve propagar erro do Redis (fail-closed)', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));

    await expect(service.isTokenBlacklisted('x')).rejects.toThrow('redis down');
  });

  it('isRefreshTokenBlacklisted deve propagar erro do Redis (fail-closed)', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));

    await expect(service.isRefreshTokenBlacklisted('r1')).rejects.toThrow(
      'redis down',
    );
  });

  it('removeFromBlacklist deve delegar ao Redis', async () => {
    await service.removeFromBlacklist('j');
    expect(redis.del).toHaveBeenCalledWith('blacklist:token:j');
  });

  it('deve usar TTL customizado quando expiresIn for informado', async () => {
    await service.addToBlacklist('j', 120);
    expect(redis.set).toHaveBeenCalledWith('blacklist:token:j', '1', 'EX', 120);
  });

  it('isRefreshTokenBlacklisted deve retornar true quando existir entrada', async () => {
    redis.get.mockResolvedValue('1');

    await expect(service.isRefreshTokenBlacklisted('r1')).resolves.toBe(true);
    expect(redis.get).toHaveBeenCalledWith('blacklist:refresh:r1');
  });

  it('removeRefreshTokenFromBlacklist deve delegar ao Redis', async () => {
    await service.removeRefreshTokenFromBlacklist('r1');
    expect(redis.del).toHaveBeenCalledWith('blacklist:refresh:r1');
  });

  it('deve usar TTL padrão quando formato de expiração for inválido', async () => {
    configGet.mockImplementation((key: string) => {
      if (key === 'jwt.expires') return 'invalid';
      if (key === 'jwt.refreshExpires') return 'invalid';
      return undefined;
    });
    service = new TokenBlacklistService(
      redis as never,
      { get: configGet } as unknown as ConfigService,
    );

    await service.addToBlacklist('j');
    expect(redis.set).toHaveBeenCalledWith('blacklist:token:j', '1', 'EX', 900);
  });

  it('deve usar TTL padrão no default do switch quando unidade for inválida', async () => {
    const matchSpy = jest
      .spyOn(String.prototype, 'match')
      .mockReturnValueOnce(['10z', '10', 'z']);

    configGet.mockImplementation((key: string) => {
      if (key === 'jwt.expires') return '10z';
      return undefined;
    });
    service = new TokenBlacklistService(
      redis as never,
      { get: configGet } as unknown as ConfigService,
    );

    await service.addToBlacklist('j');

    expect(redis.set).toHaveBeenCalledWith('blacklist:token:j', '1', 'EX', 900);

    matchSpy.mockRestore();
  });

  it('deve usar expiração padrão quando config jwt não estiver definida', async () => {
    configGet.mockReturnValue(undefined);
    service = new TokenBlacklistService(
      redis as never,
      { get: configGet } as unknown as ConfigService,
    );

    await service.addToBlacklist('j');
    await service.addRefreshTokenToBlacklist('r');

    expect(redis.set).toHaveBeenNthCalledWith(
      1,
      'blacklist:token:j',
      '1',
      'EX',
      15 * 60,
    );
    expect(redis.set).toHaveBeenNthCalledWith(
      2,
      'blacklist:refresh:r',
      '1',
      'EX',
      7 * 24 * 60 * 60,
    );
  });

  it('deve converter unidades de expiração s, h e d', async () => {
    configGet.mockImplementation((key: string) => {
      if (key === 'jwt.expires') return '30s';
      if (key === 'jwt.refreshExpires') return '2h';
      return undefined;
    });
    service = new TokenBlacklistService(
      redis as never,
      { get: configGet } as unknown as ConfigService,
    );

    await service.addToBlacklist('j');
    await service.addRefreshTokenToBlacklist('r');

    expect(redis.set).toHaveBeenNthCalledWith(
      1,
      'blacklist:token:j',
      '1',
      'EX',
      30,
    );
    expect(redis.set).toHaveBeenNthCalledWith(
      2,
      'blacklist:refresh:r',
      '1',
      'EX',
      7200,
    );
  });
});
