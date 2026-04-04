import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { UserId } from './user-id.decorator';

class UserIdHost {
  run(@UserId() _uid?: string) {
    return _uid;
  }
}

function getUserIdFactory() {
  const meta = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    UserIdHost,
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

function jwtLikePayload(id: string) {
  const payload = Buffer.from(JSON.stringify({ id }), 'utf8').toString(
    'base64',
  );
  return `h.${payload}.s`;
}

describe('user-id.decorator', () => {
  const factory = getUserIdFactory();

  it('deve extrair id do payload JWT no header authorization', () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: jwtLikePayload('user-99') },
        }),
      }),
    } as ExecutionContext;

    expect(factory(undefined, ctx)).toBe('user-99');
  });

  it('deve retornar undefined quando authorization for inválido', () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer apenas-um-segmento' },
        }),
      }),
    } as ExecutionContext;

    expect(factory(undefined, ctx)).toBeUndefined();
  });

  it('deve lançar quando authorization estiver ausente (header indefinido)', () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as ExecutionContext;

    expect(() => factory(undefined, ctx)).toThrow(TypeError);
  });
});
