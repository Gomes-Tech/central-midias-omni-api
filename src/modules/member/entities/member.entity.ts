export interface Member {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    isActive: boolean;
  };
  role: {
    id: string;
    name: string;
    label: string;
    isSystem: boolean;
    canAccessBackoffice: boolean;
    canHaveSubordinates: boolean;
  };
}
