import {
  CreateGlobalRoleDTO,
  CreateRoleDTO,
  UpdateRoleDTO,
} from '../dto';
import { Role } from '../entities';

export function makeRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 'role-id',
    label: 'Perfil',
    name: 'ROLE_CODE',
    isSystem: false,
    canAccessBackoffice: false,
    canHaveSubordinates: true,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

export function makeCreateRoleDTO(
  overrides: Partial<CreateRoleDTO> = {},
): CreateRoleDTO {
  return {
    name: 'NEW_ROLE',
    label: 'Novo perfil',
    canHaveSubordinates: true,
    categoryRoleAccesses: [{ categoryId: 'cat-1' }],
    ...overrides,
  };
}

export function makeCreateGlobalRoleDTO(
  overrides: Partial<CreateGlobalRoleDTO> = {},
): CreateGlobalRoleDTO {
  return {
    name: 'GLOBAL_ROLE',
    label: 'Perfil global',
    permissions: [{ moduleId: 'mod-1', action: 'READ' }],
    ...overrides,
  };
}

export function makeUpdateRoleDTO(
  overrides: Partial<UpdateRoleDTO> = {},
): UpdateRoleDTO {
  return {
    label: 'Atualizado',
    ...overrides,
  };
}
