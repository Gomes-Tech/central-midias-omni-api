import { CreateUserDTO, UpdateUserDTO } from '../dto';
import { User } from '../entities';
import { UserRole } from 'types/role';

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-id',
    name: 'John Doe',
    socialReason: 'John Doe LTDA',
    taxIdentifier: '12345678900',
    phone: '11999999999',
    birthDate: new Date('1990-01-01T00:00:00.000Z'),
    email: 'john@doe.com',
    password: 'hashed-password',
    isEmployee: true,
    isActive: true,
    isDeleted: false,
    isManager: false,
    roles: [
      {
        id: 'role-id',
        label: 'Administrador',
        role: 'ADMIN',
      },
    ],
    primaryRole: 'ADMIN',
    companyAccesses: [],
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
    socialReason: 'John Doe LTDA',
    taxIdentifier: '12345678900',
    phone: '11999999999',
    birthDate: '1990-01-01',
    email: 'john@doe.com',
    password: 'StrongPass123',
    isEmployee: true,
    isActive: true,
    roles: ['ADMIN'],
    companyIds: ['company-id'],
    isManager: false,
    ...overrides,
  };
}

export function makeUpdateUserDTO(
  overrides: Partial<UpdateUserDTO> = {},
): UpdateUserDTO {
  return {
    name: 'Jane Doe',
    socialReason: 'Jane Doe LTDA',
    email: 'jane@doe.com',
    taxIdentifier: '98765432100',
    phone: '11888888888',
    birthDate: '1992-02-02',
    password: 'NewStrongPass123',
    isEmployee: false,
    isActive: false,
    roles: ['COLLABORATOR'],
    companyIds: ['company-2'],
    isManager: true,
    ...overrides,
  };
}

export function makeUserRole(role: UserRole = 'ADMIN'): UserRole {
  return role;
}
