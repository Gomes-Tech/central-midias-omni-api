import {
  CHECK_OWNERSHIP_KEY,
  CheckOwnership,
} from './check-ownership.decorator';

class DefaultOpts {
  @CheckOwnership()
  m() {}
}

class CustomOpts {
  @CheckOwnership({
    resourceIdParam: 'userId',
    ownerIdField: 'createdBy',
    allowAdmin: false,
    checkFn: async () => true,
  })
  m() {}
}

describe('check-ownership.decorator', () => {
  it('deve aplicar valores padrão quando options for omitido', () => {
    expect(
      Reflect.getMetadata(CHECK_OWNERSHIP_KEY, DefaultOpts.prototype.m),
    ).toEqual({
      resourceIdParam: 'id',
      ownerIdField: 'userId',
      allowAdmin: true,
      checkFn: undefined,
    });
  });

  it('deve respeitar options customizadas', () => {
    const meta = Reflect.getMetadata(
      CHECK_OWNERSHIP_KEY,
      CustomOpts.prototype.m,
    );
    expect(meta.resourceIdParam).toBe('userId');
    expect(meta.ownerIdField).toBe('createdBy');
    expect(meta.allowAdmin).toBe(false);
    expect(typeof meta.checkFn).toBe('function');
  });
});
