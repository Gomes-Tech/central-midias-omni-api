import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SecurityLoggerService } from '@infrastructure/security';
import { lastValueFrom, of } from 'rxjs';
import { CHECK_OWNERSHIP_KEY } from '../decorators/check-ownership.decorator';
import { OwnershipInterceptor } from './ownership.interceptor';

function createContext(
  request: Record<string, unknown>,
  handler: object = {},
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => handler,
    getClass: () => class C {},
  } as unknown as ExecutionContext;
}

describe('OwnershipInterceptor', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let securityLogger: { logForbiddenAccess: jest.Mock };
  let interceptor: OwnershipInterceptor;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    securityLogger = { logForbiddenAccess: jest.fn() };
    interceptor = new OwnershipInterceptor(
      reflector as unknown as Reflector,
      securityLogger as unknown as SecurityLoggerService,
    );
  });

  it('deve permitir quando não há metadata de ownership', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const next = { handle: () => of('ok') };

    const stream = await interceptor.intercept(createContext({}), next);
    await expect(lastValueFrom(stream)).resolves.toBe('ok');
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      CHECK_OWNERSHIP_KEY,
      expect.any(Array),
    );
  });

  it('deve negar quando usuário não está autenticado', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      resourceIdParam: 'id',
      allowAdmin: true,
    });
    const next = { handle: () => of(1) };

    await expect(
      interceptor.intercept(
        createContext({ user: null, params: { id: 'r1' } }),
        next,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deve negar quando user não possui id', async () => {
    reflector.getAllAndOverride.mockReturnValue({});
    const next = { handle: () => of(1) };

    await expect(
      interceptor.intercept(
        createContext({ user: {}, params: { id: 'r1' } }),
        next,
      ),
    ).rejects.toMatchObject({ message: 'Usuário não autenticado' });
  });

  it('deve permitir quando não há id no parâmetro configurado', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      resourceIdParam: 'id',
    });
    const next = { handle: () => of('skip') };

    const stream = await interceptor.intercept(
      createContext({
        user: { id: 'u1', role: 'user' },
        params: {},
      }),
      next,
    );
    await expect(lastValueFrom(stream)).resolves.toBe('skip');
  });

  it('deve permitir admin quando allowAdmin for true', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      resourceIdParam: 'id',
      allowAdmin: true,
    });
    const next = { handle: () => of('admin') };

    const stream = await interceptor.intercept(
      createContext({
        user: { id: 'u1', role: 'admin' },
        params: { id: 'r1' },
      }),
      next,
    );
    await expect(lastValueFrom(stream)).resolves.toBe('admin');
  });

  it('deve usar checkFn e negar acesso quando retornar false', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      checkFn: jest.fn().mockResolvedValue(false),
    });
    const next = { handle: () => of(1) };
    const request = {
      user: { id: 'u1', role: 'user' },
      params: { id: 'res-1' },
      url: '/v1/x',
      method: 'GET',
      ip: '10.0.0.1',
    };

    await expect(
      interceptor.intercept(createContext(request), next),
    ).rejects.toMatchObject({
      message: 'Você não tem permissão para acessar este recurso',
    });
    expect(securityLogger.logForbiddenAccess).toHaveBeenCalledWith(
      'u1',
      '/v1/x',
      'GET',
      '10.0.0.1',
      'Ownership check failed',
      'unknown',
    );
  });

  it('deve usar checkFn e permitir quando retornar true', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      checkFn: jest.fn().mockResolvedValue(true),
    });
    const next = { handle: () => of('ok') };

    const stream = await interceptor.intercept(
      createContext({
        user: { id: 'u1', role: 'user' },
        params: { id: 'r1' },
      }),
      next,
    );
    await expect(lastValueFrom(stream)).resolves.toBe('ok');
  });

  it('deve delegar ao handler quando não há checkFn (verificação no use case)', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      resourceIdParam: 'id',
      allowAdmin: false,
      checkFn: undefined,
    });
    const next = { handle: () => of('next') };

    const stream = await interceptor.intercept(
      createContext({
        user: { id: 'u1', role: 'user' },
        params: { id: 'r1' },
      }),
      next,
    );
    await expect(lastValueFrom(stream)).resolves.toBe('next');
  });
});
