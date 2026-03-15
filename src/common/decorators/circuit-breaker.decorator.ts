import { CircuitBreakerOptions } from '@infrastructure/circuit-breaker';
import { SetMetadata } from '@nestjs/common';

export const CIRCUIT_BREAKER_KEY = 'circuit_breaker';

/**
 * Decorator para aplicar circuit breaker a um método
 * @param key Chave única para identificar o circuit breaker
 * @param options Opções de configuração do circuit breaker
 * @example
 * ```typescript
 * @CircuitBreaker('database-query', { failureThreshold: 5, timeout: 10000 })
 * async findUser(id: string) {
 *   return this.prisma.user.findUnique({ where: { id } });
 * }
 * ```
 */
export const CircuitBreaker = (key: string, options?: CircuitBreakerOptions) =>
  SetMetadata(CIRCUIT_BREAKER_KEY, { key, options });
