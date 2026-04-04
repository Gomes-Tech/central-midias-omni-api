import {
  CircuitBreakerOpenException,
  CircuitBreakerService,
  TimeoutError,
} from './circuit-breaker.service';

describe('CircuitBreakerService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('execute deve retornar resultado quando o circuit está fechado', async () => {
    const service = new CircuitBreakerService();
    await expect(
      service.execute('c1', async () => 'ok', { failureThreshold: 2 }),
    ).resolves.toBe('ok');
    expect(service.getCircuitState('c1')).toBe('CLOSED');
  });

  it('deve abrir o circuit após falhas consecutivas e lançar na próxima chamada', async () => {
    const service = new CircuitBreakerService();
    const opts = { failureThreshold: 2, resetTimeout: 1000 };

    await expect(
      service.execute('c2', async () => {
        throw new Error('boom');
      }, opts),
    ).rejects.toThrow('boom');
    await expect(
      service.execute('c2', async () => {
        throw new Error('boom');
      }, opts),
    ).rejects.toThrow('boom');

    expect(service.getCircuitState('c2')).toBe('OPEN');

    await expect(
      service.execute('c2', async () => 'x', opts),
    ).rejects.toBeInstanceOf(CircuitBreakerOpenException);
  });

  it('deve transicionar OPEN -> HALF_OPEN após resetTimeout e fechar após sucesso', async () => {
    const service = new CircuitBreakerService();
    const opts = {
      failureThreshold: 1,
      resetTimeout: 500,
      successThreshold: 1,
    };

    await expect(
      service.execute('c3', async () => {
        throw new Error('fail');
      }, opts),
    ).rejects.toThrow('fail');
    expect(service.getCircuitState('c3')).toBe('OPEN');

    jest.advanceTimersByTime(500);

    await expect(
      service.execute('c3', async () => 'recovered', opts),
    ).resolves.toBe('recovered');
    expect(service.getCircuitState('c3')).toBe('CLOSED');
  });

  it('deve lançar TimeoutError quando a operação exceder timeout', async () => {
    const service = new CircuitBreakerService();
    const p = service.execute(
      'c4',
      () => new Promise<string>(() => {}),
      { timeout: 50, failureThreshold: 10 },
    );
    jest.advanceTimersByTime(50);
    await expect(p).rejects.toBeInstanceOf(TimeoutError);
  });

  it('reset deve limpar o estado do circuit', async () => {
    const service = new CircuitBreakerService();
    await expect(
      service.execute(
        'c5',
        async () => {
          throw new Error('e');
        },
        { failureThreshold: 1 },
      ),
    ).rejects.toThrow();
    service.reset('c5');
    await expect(service.execute('c5', async () => 1)).resolves.toBe(1);
  });

  it('getStats deve retornar null para chave inexistente', () => {
    const service = new CircuitBreakerService();
    expect(service.getStats('none')).toBeNull();
  });

  it('getStats deve retornar métricas quando o circuit existir', async () => {
    const service = new CircuitBreakerService();
    await service.execute('st', async () => 'v', { failureThreshold: 5 });
    const stats = service.getStats('st');
    expect(stats).toEqual(
      expect.objectContaining({
        state: 'CLOSED',
        failures: 0,
        successes: 0,
      }),
    );
  });

  it('resetAll deve limpar todos os circuitos', async () => {
    const service = new CircuitBreakerService();
    await service.execute('r1', async () => 1);
    service.resetAll();
    expect(service.listActiveCircuits()).toEqual([]);
    expect(service.getStats('r1')).toBeNull();
  });

  it('listActiveCircuits deve listar chaves após uso', async () => {
    const service = new CircuitBreakerService();
    await service.execute('lc1', async () => 1);
    expect(service.listActiveCircuits()).toContain('lc1');
  });

  it('deve reabrir circuito quando falhar em HALF_OPEN', async () => {
    const service = new CircuitBreakerService();
    const opts = { failureThreshold: 1, resetTimeout: 400 };

    await expect(
      service.execute('hx', async () => {
        throw new Error('a');
      }, opts),
    ).rejects.toThrow('a');

    jest.advanceTimersByTime(400);

    await expect(
      service.execute('hx', async () => {
        throw new Error('b');
      }, opts),
    ).rejects.toThrow('b');

    expect(service.getCircuitState('hx')).toBe('OPEN');
  });

  it('CircuitBreakerOpenException deve expor retryAfter', () => {
    const err = new CircuitBreakerOpenException('k', 5000);
    expect(err.key).toBe('k');
    expect(err.retryAfter).toBe(5000);
    expect(err.message).toContain('k');
  });
});
