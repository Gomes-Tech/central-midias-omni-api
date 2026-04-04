import {
  makeCreateGlobalUserDTO,
  makeCreateUserDTO,
  makeUpdateUserDTO,
  makeUser,
  makeUserRole,
} from './test-helpers';

describe('user use-cases test-helpers', () => {
  it('makeUserRole retorna padrão e valor customizado', () => {
    expect(makeUserRole()).toBe('ADMIN');
    expect(makeUserRole('VIEWER')).toBe('VIEWER');
  });

  it('makeUser aplica overrides', () => {
    const u = makeUser({ id: 'x', email: 'a@b.com' });
    expect(u.id).toBe('x');
    expect(u.email).toBe('a@b.com');
  });

  it('makeCreateUserDTO e makeCreateGlobalUserDTO aplicam overrides', () => {
    expect(makeCreateUserDTO({ name: 'N' }).name).toBe('N');
    expect(makeCreateGlobalUserDTO({ name: 'G' }).name).toBe('G');
  });

  it('makeUpdateUserDTO aplica overrides', () => {
    expect(makeUpdateUserDTO({ name: 'U' }).name).toBe('U');
  });
});
