import { CacheService } from '@infrastructure/cache';
import { PrismaService } from '@infrastructure/prisma';
import { HealthCheckService } from './health-check.service';

describe('HealthCheckService', () => {
  let prisma: { $queryRaw: jest.Mock };
  let cache: jest.Mocked<Pick<CacheService, 'set' | 'get' | 'del'>>;
  let service: HealthCheckService;

  beforeEach(() => {
    prisma = { $queryRaw: jest.fn().mockResolvedValue(1) };
    cache = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({ test: true }),
      del: jest.fn().mockResolvedValue(undefined),
    };
    service = new HealthCheckService(
      prisma as unknown as PrismaService,
      cache as unknown as CacheService,
    );
  });

  it('checkHealth deve retornar ok quando banco e cache respondem', async () => {
    const result = await service.checkHealth();

    expect(result.status).toBe('ok');
    expect(result.database.status).toBe('ok');
    expect(result.database.responseTime).toBeDefined();
    expect(result.cache.status).toBe('ok');
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(cache.set).toHaveBeenCalled();
    expect(cache.get).toHaveBeenCalled();
    expect(cache.del).toHaveBeenCalled();
  });

  it('checkHealth deve retornar error quando o banco falhar', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('db down'));

    const result = await service.checkHealth();

    expect(result.status).toBe('error');
    expect(result.database.status).toBe('error');
    expect(result.database.error).toBe('db down');
    expect(result.cache.status).toBe('ok');
  });

  it('checkHealth deve retornar error quando o cache não devolver valor', async () => {
    cache.get.mockResolvedValue(null);

    const result = await service.checkHealth();

    expect(result.status).toBe('error');
    expect(result.cache.status).toBe('error');
    expect(result.cache.error).toContain('read/write');
  });

  it('checkHealth deve tratar exceção no cache com mensagem genérica', async () => {
    cache.set.mockRejectedValue('cache-boom');

    const result = await service.checkHealth();

    expect(result.status).toBe('error');
    expect(result.cache.status).toBe('error');
    expect(result.cache.error).toBe('Unknown cache error');
  });

  it('checkLiveness deve retornar status ok', () => {
    expect(service.checkLiveness()).toEqual({
      status: 'ok',
      uptime: expect.any(Number),
    });
  });

  it('checkReadiness deve refletir falhas do banco ou cache', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('x'));

    const result = await service.checkReadiness();

    expect(result.status).toBe('error');
    expect(result.database.status).toBe('error');
  });

  it('checkHealth deve tratar rejeição de checkDatabase via Promise.allSettled', async () => {
    jest
      .spyOn(service as unknown as { checkDatabase: () => Promise<unknown> }, 'checkDatabase')
      .mockRejectedValue(new Error('db rejected'));

    const result = await service.checkHealth();

    expect(result.database.status).toBe('error');
    expect(result.database.error).toBe('db rejected');
  });

  it('checkHealth deve tratar rejeição de checkCache via Promise.allSettled', async () => {
    jest
      .spyOn(service as unknown as { checkCache: () => Promise<unknown> }, 'checkCache')
      .mockRejectedValue('cache rejected');

    const result = await service.checkHealth();

    expect(result.cache.status).toBe('error');
    expect(result.cache.error).toBe('Cache check failed');
  });

  it('checkHealth deve tratar erro de banco não-Error', async () => {
    prisma.$queryRaw.mockRejectedValue('db-string');

    const result = await service.checkHealth();

    expect(result.database.error).toBe('Unknown database error');
  });

  it('checkReadiness deve marcar cache como error quando get retornar null', async () => {
    cache.get.mockResolvedValue(null);

    const result = await service.checkReadiness();

    expect(result.status).toBe('error');
    expect(result.cache.status).toBe('error');
  });

  it('checkHealth deve usar mensagem padrão quando checkDatabase rejeitar sem Error', async () => {
    jest
      .spyOn(service as unknown as { checkDatabase: () => Promise<unknown> }, 'checkDatabase')
      .mockRejectedValue('raw-db-fail');

    const result = await service.checkHealth();

    expect(result.database.error).toBe('Database check failed');
  });

  it('checkReadiness deve retornar error quando database check retornar status error', async () => {
    jest
      .spyOn(service as unknown as { checkDatabase: () => Promise<unknown> }, 'checkDatabase')
      .mockResolvedValue({ status: 'error' });

    const result = await service.checkReadiness();

    expect(result.status).toBe('error');
    expect(result.database.status).toBe('error');
  });

  it('checkReadiness deve tratar rejeição de checkCache', async () => {
    jest
      .spyOn(service as unknown as { checkCache: () => Promise<unknown> }, 'checkCache')
      .mockRejectedValue(new Error('cache down'));

    const result = await service.checkReadiness();

    expect(result.cache.status).toBe('error');
    expect(result.status).toBe('error');
  });
});
