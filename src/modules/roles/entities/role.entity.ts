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
