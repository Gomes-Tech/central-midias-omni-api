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
});
