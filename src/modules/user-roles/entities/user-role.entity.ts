export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  role: string;
  label: string;
  companyId: string;
  companyName: string;
  createdAt: Date;
  updatedAt: Date;
}
