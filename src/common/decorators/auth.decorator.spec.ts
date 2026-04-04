import { AUTH_TYPE_KEY, AuthType } from './auth.decorator';

class Stub {
  @AuthType(['jwt', 'refresh'])
  handler() {}
}

describe('auth.decorator', () => {
  it('AuthType deve registrar metadados com a lista de tipos', () => {
    expect(Reflect.getMetadata(AUTH_TYPE_KEY, Stub.prototype.handler)).toEqual([
      'jwt',
      'refresh',
    ]);
  });
});
