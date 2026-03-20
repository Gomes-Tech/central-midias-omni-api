import { UserRole } from 'types/role';

export interface UserRoleAssignment {
  id: string;
  label: string;
  role: UserRole;
}

export interface UserCompanyAccess {
  id: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  companyLogoUrl?: string | null;
}

export interface User {
  id: string;
  name: string;
  socialReason: string;
  taxIdentifier: string;
  phone: string;
  birthDate: Date;
  email: string;
  password: string;
  isEmployee: boolean;
  isActive: boolean;
  isDeleted: boolean;
  isManager: boolean;
  roles: UserRoleAssignment[];
  primaryRole: UserRole | null;
  companyAccesses: UserCompanyAccess[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ListUser {
  id: string;
  name: string;
  socialReason: string;
  taxIdentifier: string;
  email: string;
  phone: string;
  isEmployee: boolean;
  isActive: boolean;
  isManager: boolean;
  roles: UserRoleAssignment[];
  primaryRole: UserRole | null;
  companyAccesses: UserCompanyAccess[];
  createdAt: Date;
}
