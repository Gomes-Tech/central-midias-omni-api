import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import { CircuitBreakerService } from '../circuit-breaker';
import { MetricsService } from '../metrics/metrics.service';

describe('CacheService', () => {
  let cacheManager: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };
  let metrics: jest.Mocked<Pick<MetricsService, 'recordCacheHit' | 'recordCacheMiss' | 'recordCacheSet' | 'recordCacheDelete'>>;
  let circuitBreaker: { execute: jest.Mock };

  beforeEach(() => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    metrics = {
      recordCacheHit: jest.fn(),
      recordCacheMiss: jest.fn(),
      recordCacheSet: jest.fn(),
      recordCacheDelete: jest.fn(),
    };
    circuitBreaker = {
      execute: jest.fn((_key: string, op: () => Promise<unknown>) => op()),
    };
  });

  it('get deve retornar valor parseado e registrar hit', async () => {
    cacheManager.get.mockResolvedValue(JSON.stringify({ a: 1 }));
    const service = new CacheService(
      cacheManager as never,
      metrics as unknown as MetricsService,
    );

    await expect(service.get('k')).resolves.toEqual({ a: 1 });
    expect(metrics.recordCacheHit).toHaveBeenCalledWith('k');
  });

  it('get deve retornar null no miss e registrar miss', async () => {
    cacheManager.get.mockResolvedValue(undefined);
    const service = new CacheService(
      cacheManager as never,
      metrics as unknown as MetricsService,
    );

    await expect(service.get('k')).resolves.toBeNull();
    expect(metrics.recordCacheMiss).toHaveBeenCalledWith('k');
  });

  it('get deve retornar null e registrar miss quando JSON.parse falhar', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    cacheManager.get.mockResolvedValue('not-json');
    const service = new CacheService(
      cacheManager as never,
      metrics as unknown as MetricsService,
    );

    await expect(service.get('k')).resolves.toBeNull();
    expect(metrics.recordCacheMiss).toHaveBeenCalledWith('k');
    consoleSpy.mockRestore();
  });

  it('set deve serializar valor e registrar sucesso', async () => {
    const service = new CacheService(
      cacheManager as never,
      metrics as unknown as MetricsService,
    );

    await service.set('k', { x: true }, 60);

    expect(cacheManager.set).toHaveBeenCalledWith(
      'k',
      JSON.stringify({ x: true }),
      60,
    );
    expect(metrics.recordCacheSet).toHaveBeenCalledWith('k', true);
  });

  it('set deve propagar erro e registrar falha', async () => {
    cacheManager.set.mockRejectedValue(new Error('fail'));
    const service = new CacheService(
      cacheManager as never,
      metrics as unknown as MetricsService,
    );

    await expect(service.set('k', 1)).rejects.toThrow('fail');
    expect(metrics.recordCacheSet).toHaveBeenCalledWith('k', false);
  });

  it('del deve remover chave e registrar sucesso', async () => {
    const service = new CacheService(
      cacheManager as never,
      metrics as unknown as MetricsService,
    );

    await service.del('k');

    expect(cacheManager.del).toHaveBeenCalledWith('k');
    expect(metrics.recordCacheDelete).toHaveBeenCalledWith('k', true);
  });

  it('deve usar circuit breaker quando injetado', async () => {
    cacheManager.get.mockResolvedValue(JSON.stringify(1));
    const service = new CacheService(
      cacheManager as never,
      metrics as unknown as MetricsService,
      circuitBreaker as unknown as CircuitBreakerService,
    );

    await service.get('key');

    expect(circuitBreaker.execute).toHaveBeenCalledWith(
      'cache:get',
      expect.any(Function),
      expect.objectContaining({
        failureThreshold: 5,
        timeout: 5000,
        resetTimeout: 30000,
      }),
    );
  });

  it('com circuit breaker: get miss e erro em JSON.parse', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    cacheManager.get.mockResolvedValueOnce(undefined);
    cacheManager.get.mockResolvedValueOnce('invalid-json{');

    const service = new CacheService(
      cacheManager as never,
      metrics as unknown as MetricsService,
      circuitBreaker as unknown as CircuitBreakerService,
    );

    await expect(service.get('a')).resolves.toBeNull();
    await expect(service.get('b')).resolves.toBeNull();
    expect(metrics.recordCacheMiss).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('com circuit breaker: set e del com falha propagam e registram métrica', async () => {
    cacheManager.set.mockRejectedValue(new Error('set-fail'));
    cacheManager.del.mockRejectedValue(new Error('del-fail'));

    const service = new CacheService(
      cacheManager as never,
      metrics as unknown as MetricsService,
      circuitBreaker as unknown as CircuitBreakerService,
    );

    await expect(service.set('k', 1)).rejects.toThrow('set-fail');
    expect(metrics.recordCacheSet).toHaveBeenCalledWith('k', false);

    await expect(service.del('k')).rejects.toThrow('del-fail');
    expect(metrics.recordCacheDelete).toHaveBeenCalledWith('k', false);
  });

  it('get sem MetricsService não quebra', async () => {
    cacheManager.get.mockResolvedValue(JSON.stringify({ v: 1 }));
    const service = new CacheService(cacheManager as never);

    await expect(service.get('k')).resolves.toEqual({ v: 1 });
  });
});
