import { makeTokenPassword } from './test-helpers';

describe('token-password use-cases test-helpers', () => {
  it('makeTokenPassword usa defaults e overrides', () => {
    const base = makeTokenPassword();
    expect(base.id).toBe('tp-id');

    const custom = makeTokenPassword({
      id: 'custom',
      email: 'e@test.com',
      used: true,
    });
    expect(custom.id).toBe('custom');
    expect(custom.email).toBe('e@test.com');
    expect(custom.used).toBe(true);
  });
});
