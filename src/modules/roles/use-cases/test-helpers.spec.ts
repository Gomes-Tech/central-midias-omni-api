import {
  makeCreateGlobalRoleDTO,
  makeCreateRoleDTO,
  makeRole,
  makeUpdateGlobalRoleDTO,
  makeUpdateRoleDTO,
} from './test-helpers';

describe('roles use-cases test-helpers', () => {
  it('makeRole aplica overrides', () => {
    expect(makeRole({ id: 'r2' }).id).toBe('r2');
  });

  it('makeCreateRoleDTO e makeCreateGlobalRoleDTO aplicam overrides', () => {
    expect(makeCreateRoleDTO({ name: 'X' }).name).toBe('X');
    expect(makeCreateGlobalRoleDTO({ label: 'Y' }).label).toBe('Y');
  });

  it('makeUpdateRoleDTO e makeUpdateGlobalRoleDTO aplicam overrides', () => {
    expect(makeUpdateRoleDTO({ label: 'Z' }).label).toBe('Z');
    expect(makeUpdateGlobalRoleDTO()).toEqual({
      label: 'Global atualizado',
    });
    expect(makeUpdateGlobalRoleDTO({ label: 'Outro' }).label).toBe('Outro');
  });
});
