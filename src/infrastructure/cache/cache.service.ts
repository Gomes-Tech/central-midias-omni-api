import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { CircuitBreakerService } from '../circuit-breaker';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Optional() private readonly metricsService?: MetricsService,
    @Optional() private readonly circuitBreakerService?: CircuitBreakerService,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    if (this.circuitBreakerService) {
      return this.circuitBreakerService.execute(
        'cache:get',
        async () => {
          try {
            const data = await this.cacheManager.get<string>(key);
            if (data) {
              this.metricsService?.recordCacheHit(key);
              return JSON.parse(data);
            } else {
              this.metricsService?.recordCacheMiss(key);
              return null;
            }
          } catch (error) {
            console.error(error);
            this.metricsService?.recordCacheMiss(key);
            return null;
          }
        },
        {
          failureThreshold: 5,
          timeout: 5000,
          resetTimeout: 30000,
        },
      );
    }

    // Fallback sem circuit breaker
    try {
      const data = await this.cacheManager.get<string>(key);
      if (data) {
        this.metricsService?.recordCacheHit(key);
        return JSON.parse(data);
      } else {
        this.metricsService?.recordCacheMiss(key);
        return null;
      }
    } catch (error) {
      console.error(error);
      this.metricsService?.recordCacheMiss(key);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 30): Promise<void> {
    if (this.circuitBreakerService) {
      return this.circuitBreakerService.execute(
        'cache:set',
        async () => {
          try {
            await this.cacheManager.set(key, JSON.stringify(value), ttlSeconds);
            this.metricsService?.recordCacheSet(key, true);
          } catch (error) {
            this.metricsService?.recordCacheSet(key, false);
            throw error;
          }
        },
        {
          failureThreshold: 5,
          timeout: 5000,
          resetTimeout: 30000,
        },
      );
    }

    // Fallback sem circuit breaker
    try {
      await this.cacheManager.set(key, JSON.stringify(value), ttlSeconds);
      this.metricsService?.recordCacheSet(key, true);
    } catch (error) {
      this.metricsService?.recordCacheSet(key, false);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    if (this.circuitBreakerService) {
      return this.circuitBreakerService.execute(
        'cache:del',
        async () => {
          try {
            await this.cacheManager.del(key);
            this.metricsService?.recordCacheDelete(key, true);
          } catch (error) {
            this.metricsService?.recordCacheDelete(key, false);
            throw error;
          }
        },
        {
          failureThreshold: 5,
          timeout: 5000,
          resetTimeout: 30000,
        },
      );
    }

    // Fallback sem circuit breaker
    try {
      await this.cacheManager.del(key);
      this.metricsService?.recordCacheDelete(key, true);
    } catch (error) {
      this.metricsService?.recordCacheDelete(key, false);
      throw error;
    }
  }
}
