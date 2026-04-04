import { PERMISSION_KEY, RequirePermission } from './permissions.decorator';

class Stub {
  @RequirePermission('users', 'READ')
  list() {}
}

describe('permissions.decorator', () => {
  it('deve registrar recurso e ação no formato resource:action', () => {
    expect(Reflect.getMetadata(PERMISSION_KEY, Stub.prototype.list)).toBe(
      'users:READ',
    );
  });
});
