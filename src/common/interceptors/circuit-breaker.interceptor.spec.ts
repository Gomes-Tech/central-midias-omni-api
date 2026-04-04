import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CircuitBreakerService } from '@infrastructure/circuit-breaker';
import { lastValueFrom, of } from 'rxjs';
import { CIRCUIT_BREAKER_KEY } from '../decorators/circuit-breaker.decorator';
import { CircuitBreakerInterceptor } from './circuit-breaker.interceptor';

function stubHandler() {}

function createContext(): ExecutionContext {
  return {
    getHandler: () => stubHandler,
  } as unknown as ExecutionContext;
}

describe('CircuitBreakerInterceptor', () => {
  let reflector: { get: jest.Mock };
  let circuitBreakerService: { execute: jest.Mock };
  let interceptor: CircuitBreakerInterceptor;

  beforeEach(() => {
    reflector = { get: jest.fn() };
    circuitBreakerService = { execute: jest.fn() };
    interceptor = new CircuitBreakerInterceptor(
      circuitBreakerService as unknown as CircuitBreakerService,
      reflector as unknown as Reflector,
    );
  });

  it('deve delegar sem circuit breaker quando não houver metadata', async () => {
    reflector.get.mockReturnValue(undefined);
    const next = { handle: () => of('plain') };

    await expect(
      lastValueFrom(interceptor.intercept(createContext(), next)),
    ).resolves.toBe('plain');
    expect(circuitBreakerService.execute).not.toHaveBeenCalled();
    expect(reflector.get).toHaveBeenCalledWith(
      CIRCUIT_BREAKER_KEY,
      stubHandler,
    );
  });

  it('deve envolver next.handle via CircuitBreakerService.execute', async () => {
    const meta = { key: 'ext-api', options: { timeout: 100 } };
    reflector.get.mockReturnValue(meta);
    circuitBreakerService.execute.mockImplementation(
      async (_key: string, operation: () => Promise<unknown>) => operation(),
    );
    const next = { handle: () => of({ data: 42 }) };

    await expect(
      lastValueFrom(interceptor.intercept(createContext(), next)),
    ).resolves.toEqual({ data: 42 });

    expect(circuitBreakerService.execute).toHaveBeenCalledWith(
      'ext-api',
      expect.any(Function),
      { timeout: 100 },
    );
  });
});
