export interface Member {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  role: string;
}

export interface MemberRole {
  label: string;
  canAccessBackoffice: boolean;
  permissions: MemberRolePermission[];
  categoryRoleAccesses: MemberRoleCategoryRoleAccess[];
}

interface MemberRolePermission {
  id: string;
  action: typeof ACTION;
  module: { id: string; name: string; label: string };
}

interface MemberRoleCategoryRoleAccess {
  id: string;
  categoryId: string;
  organizationId: string;
  category: { id: string; name: string; slug: string };
}

export const ACTION = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
} as const;
