import {
  CIRCUIT_BREAKER_KEY,
  CircuitBreaker,
} from './circuit-breaker.decorator';

class Stub {
  @CircuitBreaker('ext-api', { timeout: 5000, failureThreshold: 3 })
  call() {}
}

describe('circuit-breaker.decorator', () => {
  it('deve registrar key e options no handler', () => {
    expect(
      Reflect.getMetadata(CIRCUIT_BREAKER_KEY, Stub.prototype.call),
    ).toEqual({
      key: 'ext-api',
      options: { timeout: 5000, failureThreshold: 3 },
    });
  });
});
