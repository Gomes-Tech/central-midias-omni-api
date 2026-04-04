import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('recordHttpRequest deve observar duração e incrementar contadores', () => {
    const service = new MetricsService();
    const observeSpy = jest.spyOn(service.httpRequestDuration, 'observe');
    const totalSpy = jest.spyOn(service.httpRequestTotal, 'inc');

    service.recordHttpRequest('GET', '/x', 200, 0.5);

    expect(observeSpy).toHaveBeenCalledWith(
      { method: 'GET', route: '/x', status_code: '200' },
      0.5,
    );
    expect(totalSpy).toHaveBeenCalled();
  });

  it('recordHttpRequest deve incrementar erros para status >= 400', () => {
    const service = new MetricsService();
    const errSpy = jest.spyOn(service.httpRequestErrors, 'inc');

    service.recordHttpRequest('POST', '/x', 404, 0.1);

    expect(errSpy).toHaveBeenCalled();
  });

  it('recordDbQuery deve registrar sucesso e erro', () => {
    const service = new MetricsService();
    const durationSpy = jest.spyOn(service.dbQueryDuration, 'observe');

    service.recordDbQuery('findMany', 'User', 0.02, true);
    service.recordDbQuery('findMany', 'User', 0.03, false);

    expect(durationSpy).toHaveBeenCalledTimes(2);
  });

  it('métodos de cache devem incrementar contadores', () => {
    const service = new MetricsService();
    const hitsSpy = jest.spyOn(service.cacheHits, 'inc');

    service.recordCacheHit('k');
    service.recordCacheMiss('k');
    service.recordCacheSet('k', true);
    service.recordCacheDelete('k', false);

    expect(hitsSpy).toHaveBeenCalledWith({ key: 'k' });
  });

  it('setCircuitBreakerState e gauges devem aceitar valores', () => {
    const service = new MetricsService();
    const setSpy = jest.spyOn(service.circuitBreakerState, 'set');

    service.setCircuitBreakerState('cb', 2);
    service.setDbConnectionsActive(3);
    service.setActiveConnections(4);

    expect(setSpy).toHaveBeenCalledWith({ key: 'cb' }, 2);
  });

  it('getMetrics deve retornar string Prometheus', async () => {
    const service = new MetricsService();
    const text = await service.getMetrics();
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });

  it('getRegistry deve retornar o registry interno', () => {
    const service = new MetricsService();
    expect(service.getRegistry()).toBeDefined();
  });
});
