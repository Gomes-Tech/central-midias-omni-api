export interface PlatformRoleSummary {
  id: string;
  name: string;
  label: string;
  isSystem: boolean;
  isBackoffice: boolean;
  canHaveSubordinates: boolean;
}

export interface UserOrganizationAccess {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationLogoUrl?: string | null;
  organizationIsActive: boolean;
}

export interface UserManagerLink {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  managerId: string;
  managerName: string;
  managerEmail: string;
  createdAt: Date;
}

export interface UserSubordinateLink {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  subordinateId: string;
  subordinateName: string;
  subordinateEmail: string;
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  taxIdentifier: string;
  phone?: string | null;
  socialReason?: string | null;
  avatarUrl?: string | null;
  isFirstAccess: boolean;
  isActive: boolean;
  isDeleted: boolean;
  organizations: UserOrganizationAccess[];
  managers: UserManagerLink[];
  subordinates: UserSubordinateLink[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ListUser {
  id: string;
  name: string;
  email: string;
  taxIdentifier: string;
  phone?: string | null;
  socialReason?: string | null;
  avatarUrl?: string | null;
  isFirstAccess: boolean;
  isActive: boolean;
  isDeleted: boolean;
  platformRoleId: string;
  platformRole: PlatformRoleSummary;
  organizations: UserOrganizationAccess[];
  managerCount: number;
  subordinateCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
