import { IS_PUBLIC_KEY, Public } from './public.decorator';

class Stub {
  @Public()
  open() {}
}

describe('public.decorator', () => {
  it('deve marcar rota como pública', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, Stub.prototype.open)).toBe(true);
  });
});
