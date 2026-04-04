import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { REQUEST_ID_KEY } from '../interceptors/request-id.interceptor';
import { RequestId } from './request-id.decorator';

class RequestIdHost {
  run(@RequestId() _id?: string) {
    return _id;
  }
}

function getRequestIdFactory() {
  const meta = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    RequestIdHost,
    'run',
  ) as Record<
    string,
    {
      index: number;
      factory: (d: unknown, c: ExecutionContext) => string | undefined;
    }
  >;
  const entry = Object.values(meta).find((v) => v.index === 0);
  if (!entry?.factory) {
    throw new Error('factory not found');
  }
  return entry.factory;
}

describe('request-id.decorator', () => {
  const factory = getRequestIdFactory();

  it('deve retornar request[REQUEST_ID_KEY] quando existir', () => {
    const req = { [REQUEST_ID_KEY]: 'rid-abc' };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as ExecutionContext;

    expect(factory(undefined, ctx)).toBe('rid-abc');
  });

  it('deve retornar undefined quando request id não estiver definido', () => {
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as ExecutionContext;

    expect(factory(undefined, ctx)).toBeUndefined();
  });
});
