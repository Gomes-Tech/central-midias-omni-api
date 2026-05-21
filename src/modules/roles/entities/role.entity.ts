export interface Role {
  id: string;
  label: string;
  name: string;
  isSystem: boolean;
  canAccessBackoffice: boolean;
  canHaveSubordinates: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface RoleCategoryRoleAccessList {
  id: string;
  categoryId: string;
  organizationId: string;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface RolePermissionList {
  id: string;
  name: string;
  label: string;
  canHaveSubordinates: boolean;
  categoryRoleAccesses: RoleCategoryRoleAccessList[];
}

export interface RolePermissionListResponse {
  data: RolePermissionList[];
  total: number;
  page: number;
  currentPage: number;
  totalPages: number;
}
