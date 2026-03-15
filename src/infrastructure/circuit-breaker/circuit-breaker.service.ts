import { Injectable, Logger, Optional } from '@nestjs/common';
import { MetricsService } from '../metrics/metrics.service';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /**
   * Número de falhas consecutivas antes de abrir o circuit
   * @default 5
   */
  failureThreshold?: number;

  /**
   * Timeout em milissegundos para operações
   * @default 10000 (10 segundos)
   */
  timeout?: number;

  /**
   * Tempo em milissegundos antes de tentar fechar o circuit (HALF_OPEN)
   * @default 60000 (60 segundos)
   */
  resetTimeout?: number;

  /**
   * Número de sucessos necessários no estado HALF_OPEN para fechar o circuit
   * @default 1
   */
  successThreshold?: number;
}

interface CircuitStateData {
  failures: number;
  successes: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  state: CircuitState;
  openedAt: Date | null;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly states = new Map<string, CircuitStateData>();

  private readonly defaultOptions: Required<CircuitBreakerOptions> = {
    failureThreshold: 5,
    timeout: 10000,
    resetTimeout: 60000,
    successThreshold: 1,
  };

  constructor(@Optional() private readonly metricsService?: MetricsService) {}

  /**
   * Executa uma operação protegida por circuit breaker
   * @param key Identificador único do circuit breaker
   * @param operation Operação a ser executada
   * @param options Opções de configuração do circuit breaker
   * @returns Resultado da operação
   * @throws CircuitBreakerOpenException se o circuit estiver aberto
   * @throws TimeoutError se a operação exceder o timeout
   */
  async execute<T>(
    key: string,
    operation: () => Promise<T>,
    options: CircuitBreakerOptions = {},
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    const state = this.getState(key);

    // Verificar se o circuit está aberto
    if (state.state === 'OPEN') {
      const timeSinceOpen = state.openedAt
        ? Date.now() - state.openedAt.getTime()
        : Infinity;

      if (timeSinceOpen >= opts.resetTimeout) {
        // Tentar transicionar para HALF_OPEN
        this.logger.warn(
          `Circuit breaker ${key} transitioning from OPEN to HALF_OPEN`,
        );
        state.state = 'HALF_OPEN';
        state.failures = 0;
        state.successes = 0;
        state.openedAt = null;
        this.recordStateChange(key, 'HALF_OPEN');
      } else {
        // Circuit ainda está aberto
        this.recordCircuitOpen(key);
        throw new CircuitBreakerOpenException(
          key,
          opts.resetTimeout - timeSinceOpen,
        );
      }
    }

    // Executar operação com timeout
    try {
      const result = await Promise.race([
        operation(),
        this.createTimeoutPromise(opts.timeout, key),
      ]);

      // Sucesso - resetar contadores
      this.handleSuccess(key, state, opts);
      return result;
    } catch (error) {
      // Falha - incrementar contador
      this.handleFailure(key, state, opts, error);
      throw error;
    }
  }

  /**
   * Obtém o estado atual de um circuit breaker
   */
  getCircuitState(key: string): CircuitState {
    return this.getState(key).state;
  }

  /**
   * Reseta o estado de um circuit breaker
   */
  reset(key: string): void {
    this.logger.log(`Resetting circuit breaker ${key}`);
    this.states.delete(key);
    this.recordStateChange(key, 'CLOSED');
  }

  /**
   * Reseta todos os circuit breakers
   */
  resetAll(): void {
    this.logger.log('Resetting all circuit breakers');
    this.states.clear();
  }

  /**
   * Obtém estatísticas de um circuit breaker
   */
  getStats(key: string): {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailure: Date | null;
    lastSuccess: Date | null;
    openedAt: Date | null;
  } | null {
    const state = this.states.get(key);
    if (!state) {
      return null;
    }

    return {
      state: state.state,
      failures: state.failures,
      successes: state.successes,
      lastFailure: state.lastFailure,
      lastSuccess: state.lastSuccess,
      openedAt: state.openedAt,
    };
  }

  /**
   * Lista todas as chaves de circuit breakers ativos
   */
  listActiveCircuits(): string[] {
    return Array.from(this.states.keys());
  }

  private getState(key: string): CircuitStateData {
    if (!this.states.has(key)) {
      this.states.set(key, {
        failures: 0,
        successes: 0,
        lastFailure: null,
        lastSuccess: null,
        state: 'CLOSED',
        openedAt: null,
      });
    }
    return this.states.get(key)!;
  }

  private createTimeoutPromise(timeout: number, key: string): Promise<never> {
    return new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(`Operation timeout after ${timeout}ms`, key));
      }, timeout);
    });
  }

  private handleSuccess(
    key: string,
    state: CircuitStateData,
    options: Required<CircuitBreakerOptions>,
  ): void {
    state.lastSuccess = new Date();

    if (state.state === 'HALF_OPEN') {
      state.successes++;
      if (state.successes >= options.successThreshold) {
        this.logger.log(
          `Circuit breaker ${key} transitioning from HALF_OPEN to CLOSED`,
        );
        state.state = 'CLOSED';
        state.failures = 0;
        state.successes = 0;
        this.recordStateChange(key, 'CLOSED');
      }
    } else {
      // CLOSED - resetar contador de falhas
      state.failures = 0;
    }

    this.recordSuccess(key);
  }

  private handleFailure(
    key: string,
    state: CircuitStateData,
    options: Required<CircuitBreakerOptions>,
    error: unknown,
  ): void {
    state.failures++;
    state.lastFailure = new Date();

    this.recordFailure(key, error);

    if (state.state === 'HALF_OPEN') {
      // Falha em HALF_OPEN - voltar para OPEN
      this.logger.warn(
        `Circuit breaker ${key} transitioning from HALF_OPEN to OPEN after failure`,
      );
      state.state = 'OPEN';
      state.openedAt = new Date();
      state.successes = 0;
      this.recordStateChange(key, 'OPEN');
    } else if (state.failures >= options.failureThreshold) {
      // CLOSED - abrir o circuit
      this.logger.error(
        `Circuit breaker ${key} opening after ${state.failures} failures`,
      );
      state.state = 'OPEN';
      state.openedAt = new Date();
      this.recordStateChange(key, 'OPEN');
    }
  }

  private recordStateChange(key: string, state: CircuitState): void {
    this.metricsService?.circuitBreakerStateChanges?.inc({ key, state });
    // Atualizar gauge de estado (0=CLOSED, 1=HALF_OPEN, 2=OPEN)
    const stateValue = state === 'CLOSED' ? 0 : state === 'HALF_OPEN' ? 1 : 2;
    this.metricsService?.setCircuitBreakerState(key, stateValue);
  }

  private recordSuccess(key: string): void {
    this.metricsService?.circuitBreakerSuccesses?.inc({ key });
  }

  private recordFailure(key: string, error: unknown): void {
    const errorType = error instanceof TimeoutError ? 'timeout' : 'error';
    this.metricsService?.circuitBreakerFailures?.inc({ key, type: errorType });
  }

  private recordCircuitOpen(key: string): void {
    this.metricsService?.circuitBreakerOpens?.inc({ key });
  }
}

/**
 * Exceção lançada quando o circuit breaker está aberto
 */
export class CircuitBreakerOpenException extends Error {
  constructor(
    public readonly key: string,
    public readonly retryAfter: number,
  ) {
    super(
      `Circuit breaker is OPEN for ${key}. Retry after ${Math.ceil(retryAfter / 1000)}s`,
    );
    this.name = 'CircuitBreakerOpenException';
  }
}

/**
 * Exceção lançada quando uma operação excede o timeout
 */
export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly key: string,
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}
