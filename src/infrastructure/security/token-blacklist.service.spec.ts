import { CacheService } from '@infrastructure/cache';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistService } from './token-blacklist.service';

describe('TokenBlacklistService', () => {
  let cache: jest.Mocked<Pick<CacheService, 'set' | 'get' | 'del'>>;
  let configGet: jest.Mock;
  let service: TokenBlacklistService;

  beforeEach(() => {
    cache = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(undefined),
    };
    configGet = jest.fn((key: string) => {
      if (key === 'jwt.expires') return '15m';
      if (key === 'jwt.refreshExpires') return '7d';
      return undefined;
    });
    service = new TokenBlacklistService(
      cache as unknown as CacheService,
      { get: configGet } as unknown as ConfigService,
    );
  });

  it('addToBlacklist deve gravar com prefixo e TTL em segundos', async () => {
    await service.addToBlacklist('jti-1');

    expect(cache.set).toHaveBeenCalledWith(
      'blacklist:token:jti-1',
      expect.objectContaining({ blacklisted: true }),
      15 * 60,
    );
  });

  it('addRefreshTokenToBlacklist deve usar refresh TTL', async () => {
    await service.addRefreshTokenToBlacklist('r1');

    expect(cache.set).toHaveBeenCalledWith(
      'blacklist:refresh:r1',
      expect.any(Object),
      7 * 24 * 60 * 60,
    );
  });

  it('isTokenBlacklisted deve retornar true quando existir entrada', async () => {
    cache.get.mockResolvedValue({ blacklisted: true, timestamp: 1 });

    await expect(service.isTokenBlacklisted('x')).resolves.toBe(true);
  });

  it('removeFromBlacklist deve delegar ao cache', async () => {
    await service.removeFromBlacklist('j');
    expect(cache.del).toHaveBeenCalledWith('blacklist:token:j');
  });

  it('deve usar TTL customizado quando expiresIn for informado', async () => {
    await service.addToBlacklist('j', 120);
    expect(cache.set).toHaveBeenCalledWith(
      'blacklist:token:j',
      expect.any(Object),
      120,
    );
  });

  it('isRefreshTokenBlacklisted deve retornar true quando existir entrada', async () => {
    cache.get.mockResolvedValue({ blacklisted: true, timestamp: 1 });

    await expect(service.isRefreshTokenBlacklisted('r1')).resolves.toBe(true);
    expect(cache.get).toHaveBeenCalledWith('blacklist:refresh:r1');
  });

  it('removeRefreshTokenFromBlacklist deve delegar ao cache', async () => {
    await service.removeRefreshTokenFromBlacklist('r1');
    expect(cache.del).toHaveBeenCalledWith('blacklist:refresh:r1');
  });

  it('deve usar TTL padrão quando formato de expiração for inválido', async () => {
    configGet.mockImplementation((key: string) => {
      if (key === 'jwt.expires') return 'invalid';
      if (key === 'jwt.refreshExpires') return 'invalid';
      return undefined;
    });
    service = new TokenBlacklistService(
      cache as unknown as CacheService,
      { get: configGet } as unknown as ConfigService,
    );

    await service.addToBlacklist('j');
    expect(cache.set).toHaveBeenCalledWith(
      'blacklist:token:j',
      expect.any(Object),
      900,
    );
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
      cache as unknown as CacheService,
      { get: configGet } as unknown as ConfigService,
    );

    await service.addToBlacklist('j');

    expect(cache.set).toHaveBeenCalledWith(
      'blacklist:token:j',
      expect.any(Object),
      900,
    );

    matchSpy.mockRestore();
  });

  it('deve usar expiração padrão quando config jwt não estiver definida', async () => {
    configGet.mockReturnValue(undefined);
    service = new TokenBlacklistService(
      cache as unknown as CacheService,
      { get: configGet } as unknown as ConfigService,
    );

    await service.addToBlacklist('j');
    await service.addRefreshTokenToBlacklist('r');

    expect(cache.set).toHaveBeenNthCalledWith(
      1,
      'blacklist:token:j',
      expect.any(Object),
      15 * 60,
    );
    expect(cache.set).toHaveBeenNthCalledWith(
      2,
      'blacklist:refresh:r',
      expect.any(Object),
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
      cache as unknown as CacheService,
      { get: configGet } as unknown as ConfigService,
    );

    await service.addToBlacklist('j');
    await service.addRefreshTokenToBlacklist('r');

    expect(cache.set).toHaveBeenNthCalledWith(
      1,
      'blacklist:token:j',
      expect.any(Object),
      30,
    );
    expect(cache.set).toHaveBeenNthCalledWith(
      2,
      'blacklist:refresh:r',
      expect.any(Object),
      7200,
    );
  });
});
