import { ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

describe('MetricsInterceptor', () => {
  let metrics: jest.Mocked<Pick<MetricsService, 'recordHttpRequest'>>;
  let interceptor: MetricsInterceptor;

  beforeEach(() => {
    metrics = { recordHttpRequest: jest.fn() };
    interceptor = new MetricsInterceptor(metrics as unknown as MetricsService);
  });

  function makeContext(req: Partial<import('express').Request>) {
    return {
      switchToHttp: () => ({
        getRequest: () =>
          ({
            method: 'GET',
            path: '/',
            ...req,
          }) as import('express').Request,
        getResponse: () =>
          ({ statusCode: 200 }) as import('express').Response,
      }),
    } as ExecutionContext;
  }

  it('deve registrar métricas em resposta bem-sucedida', (done) => {
    const context = makeContext({ path: '/api/users/550e8400-e29b-41d4-a716-446655440000' });
    const next = { handle: () => of('ok') };

    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(metrics.recordHttpRequest).toHaveBeenCalledWith(
          'GET',
          '/api/users/:id',
          200,
          expect.any(Number),
        );
        done();
      },
    });
  });

  it('deve usar request.route.path quando existir', (done) => {
    const context = makeContext({
      route: { path: '/defined' } as NonNullable<import('express').Request['route']>,
      path: '/ignored',
    });
    const next = { handle: () => of(1) };

    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(metrics.recordHttpRequest).toHaveBeenCalledWith(
          'GET',
          '/defined',
          200,
          expect.any(Number),
        );
        done();
      },
    });
  });

  it('deve registrar métricas em erro e relançar', (done) => {
    const context = makeContext({ path: '/x' });
    const err = Object.assign(new Error('fail'), { status: 403 });
    const next = { handle: () => throwError(() => err) };

    interceptor.intercept(context, next).subscribe({
      error: (e) => {
        expect(e).toBe(err);
        expect(metrics.recordHttpRequest).toHaveBeenCalledWith(
          'GET',
          '/x',
          403,
          expect.any(Number),
        );
        done();
      },
    });
  });
});
