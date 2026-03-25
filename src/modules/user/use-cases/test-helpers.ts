import { CreateUserDTO, UpdateUserDTO } from '../dto';
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
    avatarUrl: null,
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

export function makeCreateUserDTO(
  overrides: Partial<CreateUserDTO> = {},
): CreateUserDTO {
  return {
    name: 'John Doe',
    email: 'john@doe.com',
    password: 'StrongPass123',
    taxIdentifier: '12345678901',
    isActive: true,
    platformRoleId: 'platform-role-id',
    organizationIds: ['organization-id'],
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
        organizationId: 'organization-2',
      },
    ],
    ...overrides,
  };
}

export function makeUserRole(role = 'ADMIN'): string {
  return role;
}
