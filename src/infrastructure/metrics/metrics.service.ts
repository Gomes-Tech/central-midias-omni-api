import { Injectable } from '@nestjs/common';
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: Registry;

  // Métricas HTTP
  public readonly httpRequestDuration: Histogram<string>;
  public readonly httpRequestTotal: Counter<string>;
  public readonly httpRequestErrors: Counter<string>;

  // Métricas de Database
  public readonly dbQueryDuration: Histogram<string>;
  public readonly dbQueryTotal: Counter<string>;
  public readonly dbQueryErrors: Counter<string>;
  public readonly dbConnectionsActive: Gauge<string>;

  // Métricas de Cache
  public readonly cacheHits: Counter<string>;
  public readonly cacheMisses: Counter<string>;
  public readonly cacheOperations: Counter<string>;

  // Métricas de Circuit Breaker
  public readonly circuitBreakerStateChanges: Counter<string>;
  public readonly circuitBreakerSuccesses: Counter<string>;
  public readonly circuitBreakerFailures: Counter<string>;
  public readonly circuitBreakerOpens: Counter<string>;
  public readonly circuitBreakerState: Gauge<string>;

  // Métricas de Sistema
  public readonly activeConnections: Gauge<string>;
  public readonly memoryUsage: Gauge<string>;
  public readonly cpuUsage: Gauge<string>;

  constructor() {
    this.registry = new Registry();

    // Coletar métricas padrão do Node.js (CPU, memória, etc.)
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'nodejs_',
    });

    // Métricas HTTP
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duração das requisições HTTP em segundos',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers: [this.registry],
    });

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total de requisições HTTP',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestErrors = new Counter({
      name: 'http_request_errors_total',
      help: 'Total de erros em requisições HTTP',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    // Métricas de Database
    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duração das queries do banco de dados em segundos',
      labelNames: ['operation', 'model'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.dbQueryTotal = new Counter({
      name: 'db_queries_total',
      help: 'Total de queries executadas',
      labelNames: ['operation', 'model', 'status'],
      registers: [this.registry],
    });

    this.dbQueryErrors = new Counter({
      name: 'db_query_errors_total',
      help: 'Total de erros em queries',
      labelNames: ['operation', 'model'],
      registers: [this.registry],
    });

    this.dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Número de conexões ativas com o banco de dados',
      registers: [this.registry],
    });

    // Métricas de Cache
    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total de hits no cache',
      labelNames: ['key'],
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total de misses no cache',
      labelNames: ['key'],
      registers: [this.registry],
    });

    this.cacheOperations = new Counter({
      name: 'cache_operations_total',
      help: 'Total de operações no cache',
      labelNames: ['operation', 'status'],
      registers: [this.registry],
    });

    // Métricas de Circuit Breaker
    this.circuitBreakerStateChanges = new Counter({
      name: 'circuit_breaker_state_changes_total',
      help: 'Total de mudanças de estado do circuit breaker',
      labelNames: ['key', 'state'],
      registers: [this.registry],
    });

    this.circuitBreakerSuccesses = new Counter({
      name: 'circuit_breaker_successes_total',
      help: 'Total de sucessos no circuit breaker',
      labelNames: ['key'],
      registers: [this.registry],
    });

    this.circuitBreakerFailures = new Counter({
      name: 'circuit_breaker_failures_total',
      help: 'Total de falhas no circuit breaker',
      labelNames: ['key', 'type'],
      registers: [this.registry],
    });

    this.circuitBreakerOpens = new Counter({
      name: 'circuit_breaker_opens_total',
      help: 'Total de vezes que o circuit breaker foi aberto',
      labelNames: ['key'],
      registers: [this.registry],
    });

    this.circuitBreakerState = new Gauge({
      name: 'circuit_breaker_state',
      help: 'Estado atual do circuit breaker (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
      labelNames: ['key'],
      registers: [this.registry],
    });

    // Métricas de Sistema
    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Número de conexões ativas',
      registers: [this.registry],
    });

    this.memoryUsage = new Gauge({
      name: 'memory_usage_bytes',
      help: 'Uso de memória em bytes',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.cpuUsage = new Gauge({
      name: 'cpu_usage_percent',
      help: 'Uso de CPU em percentual',
      registers: [this.registry],
    });

    // Atualizar métricas de sistema periodicamente
    this.startSystemMetrics();
  }

  private startSystemMetrics() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.memoryUsage.set({ type: 'heap_used' }, memUsage.heapUsed);
      this.memoryUsage.set({ type: 'heap_total' }, memUsage.heapTotal);
      this.memoryUsage.set({ type: 'external' }, memUsage.external);
      this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
    }, 5000); // Atualizar a cada 5 segundos
  }

  /**
   * Registra a duração de uma requisição HTTP
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
  ) {
    const labels = {
      method,
      route,
      status_code: statusCode.toString(),
    };

    this.httpRequestDuration.observe(labels, duration);
    this.httpRequestTotal.inc(labels);

    if (statusCode >= 400) {
      this.httpRequestErrors.inc(labels);
    }
  }

  /**
   * Registra uma query do banco de dados
   */
  recordDbQuery(
    operation: string,
    model: string,
    duration: number,
    success: boolean,
  ) {
    const labels = {
      operation,
      model,
    };

    this.dbQueryDuration.observe(labels, duration);
    this.dbQueryTotal.inc({
      ...labels,
      status: success ? 'success' : 'error',
    });

    if (!success) {
      this.dbQueryErrors.inc(labels);
    }
  }

  /**
   * Registra uma operação de cache
   */
  recordCacheHit(key: string) {
    this.cacheHits.inc({ key });
    this.cacheOperations.inc({ operation: 'get', status: 'hit' });
  }

  recordCacheMiss(key: string) {
    this.cacheMisses.inc({ key });
    this.cacheOperations.inc({ operation: 'get', status: 'miss' });
  }

  recordCacheSet(key: string, success: boolean) {
    this.cacheOperations.inc({
      operation: 'set',
      status: success ? 'success' : 'error',
    });
  }

  recordCacheDelete(key: string, success: boolean) {
    this.cacheOperations.inc({
      operation: 'delete',
      status: success ? 'success' : 'error',
    });
  }

  /**
   * Atualiza o estado do circuit breaker
   * @param key Chave do circuit breaker
   * @param state Estado (0=CLOSED, 1=HALF_OPEN, 2=OPEN)
   */
  setCircuitBreakerState(key: string, state: number) {
    this.circuitBreakerState.set({ key }, state);
  }

  /**
   * Atualiza o número de conexões ativas do banco
   */
  setDbConnectionsActive(count: number) {
    this.dbConnectionsActive.set(count);
  }

  /**
   * Atualiza o número de conexões ativas
   */
  setActiveConnections(count: number) {
    this.activeConnections.set(count);
  }

  /**
   * Retorna as métricas no formato Prometheus
   */
  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }

  /**
   * Retorna o registro de métricas
   */
  getRegistry(): Registry {
    return this.registry;
  }
}
