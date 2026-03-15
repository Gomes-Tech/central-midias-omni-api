import { CacheService } from '@infrastructure/cache';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';

export interface HealthCheckResult {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  database: {
    status: 'ok' | 'error';
    responseTime?: number;
    error?: string;
  };
  cache: {
    status: 'ok' | 'error';
    responseTime?: number;
    error?: string;
  };
}

@Injectable()
export class HealthCheckService {
  private readonly startTime = Date.now();

  constructor(
    private readonly prismaService: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Verifica a saúde completa da aplicação
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const [databaseCheck, cacheCheck] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkCache(),
    ]);

    const database =
      databaseCheck.status === 'fulfilled'
        ? databaseCheck.value
        : {
            status: 'error' as const,
            error: databaseCheck.reason?.message || 'Database check failed',
          };

    const cache =
      cacheCheck.status === 'fulfilled'
        ? cacheCheck.value
        : {
            status: 'error' as const,
            error: cacheCheck.reason?.message || 'Cache check failed',
          };

    const overallStatus =
      database.status === 'ok' && cache.status === 'ok' ? 'ok' : 'error';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database,
      cache,
    };
  }

  /**
   * Verifica apenas se a aplicação está viva (liveness probe)
   */
  checkLiveness(): { status: 'ok'; uptime: number } {
    return {
      status: 'ok',
      uptime: process.uptime(),
    };
  }

  /**
   * Verifica se a aplicação está pronta para receber tráfego (readiness probe)
   */
  async checkReadiness(): Promise<{
    status: 'ok' | 'error';
    database: { status: 'ok' | 'error' };
    cache: { status: 'ok' | 'error' };
  }> {
    const [databaseCheck, cacheCheck] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkCache(),
    ]);

    const database =
      databaseCheck.status === 'fulfilled' &&
      databaseCheck.value.status === 'ok'
        ? { status: 'ok' as const }
        : { status: 'error' as const };

    const cache =
      cacheCheck.status === 'fulfilled' && cacheCheck.value.status === 'ok'
        ? { status: 'ok' as const }
        : { status: 'error' as const };

    const overallStatus =
      database.status === 'ok' && cache.status === 'ok' ? 'ok' : 'error';

    return {
      status: overallStatus,
      database,
      cache,
    };
  }

  /**
   * Verifica a conexão com o banco de dados
   */
  private async checkDatabase(): Promise<{
    status: 'ok' | 'error';
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      // Executa uma query simples para verificar a conexão
      await this.prismaService.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      return {
        status: 'ok',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'error',
        responseTime: Date.now() - startTime,
        error:
          error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  /**
   * Verifica a conexão com o cache (Redis)
   */
  private async checkCache(): Promise<{
    status: 'ok' | 'error';
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    const testKey = 'health:check:' + Date.now();
    try {
      // Tenta escrever e ler do cache
      await this.cacheService.set(testKey, { test: true }, 1);
      const result = await this.cacheService.get(testKey);
      await this.cacheService.del(testKey);

      const responseTime = Date.now() - startTime;

      if (result) {
        return {
          status: 'ok',
          responseTime,
        };
      } else {
        return {
          status: 'error',
          responseTime,
          error: 'Cache read/write test failed',
        };
      }
    } catch (error) {
      return {
        status: 'error',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown cache error',
      };
    }
  }
}
