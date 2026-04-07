import { CreateGlobalUserDTO, CreateUserDTO, UpdateUserDTO } from '../dto';
import { User } from '../entities';

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-id',
    name: 'John Doe',
    email: 'john@doe.com',
    password: 'hashed-password',
    taxIdentifier: '12345678901',
    phone: null,
    socialReason: null,
    avatarKey: null,
    isFirstAccess: true,
    isActive: true,
    isDeleted: false,
    organizations: [
      {
        id: 'access-id',
        organizationId: 'organization-id',
        organizationName: 'Org 1',
        organizationSlug: 'org-1',
        organizationLogoUrl: null,
        organizationIsActive: true,
      },
    ],
    managers: [],
    subordinates: [],
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

export function makeCreateGlobalUserDTO(
  overrides: Partial<CreateGlobalUserDTO> = {},
): CreateGlobalUserDTO {
  return {
    name: 'Global User',
    email: 'global@example.com',
    taxIdentifier: '98765432100',
    globalRoleId: '00000000-0000-4000-8000-000000000001',
    organizationIds: ['00000000-0000-4000-8000-000000000002'],
    ...overrides,
  };
}

export function makeCreateUserDTO(
  overrides: Partial<CreateUserDTO> = {},
): CreateUserDTO {
  return {
    name: 'John Doe',
    email: 'john@doe.com',
    taxIdentifier: '12345678901',
    roleId: 'role-id',
    phone: '12345678901',
    socialReason: 'Social Reason',
    birthDate: '2024-01-01',
    admissionDate: '2024-01-01',
    managerAssignments: [],
    ...overrides,
  };
}

export function makeUpdateUserDTO(
  overrides: Partial<UpdateUserDTO> = {},
): UpdateUserDTO {
  return {
    name: 'Jane Doe',
    email: 'jane@doe.com',
    password: 'NewStrongPass123',
    isActive: false,
    organizationIds: ['organization-2'],
    managerAssignments: [
      {
        managerId: 'manager-id',
      },
    ],
    ...overrides,
  };
}

export function makeUserRole(role = 'ADMIN'): string {
  return role;
}
