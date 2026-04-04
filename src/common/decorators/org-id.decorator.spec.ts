import { BadRequestException } from '@common/filters';
import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { OrgId } from './org-id.decorator';

class OrgIdHost {
  run(@OrgId() _org: string) {
    return _org;
  }
}

function getOrgIdFactory() {
  const meta = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    OrgIdHost,
    'run',
  ) as Record<
    string,
    { index: number; factory: (d: unknown, c: ExecutionContext) => string }
  >;
  const entry = Object.values(meta).find((v) => v.index === 0);
  if (!entry?.factory) {
    throw new Error('factory not found');
  }
  return entry.factory;
}

describe('org-id.decorator', () => {
  const factory = getOrgIdFactory();

  it('deve retornar x-organization-id do header', () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-organization-id': 'org-42' },
        }),
      }),
    } as ExecutionContext;

    expect(factory(undefined, ctx)).toBe('org-42');
  });

  it('deve lançar BadRequest quando o header estiver ausente', () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as ExecutionContext;

    expect(() => factory(undefined, ctx)).toThrow(BadRequestException);
    expect(() => factory(undefined, ctx)).toThrow('Permissão insuficiente.');
  });
});
