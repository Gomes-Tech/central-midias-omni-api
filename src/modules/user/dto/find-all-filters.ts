export interface FindAllUsersFilters {
  page?: number;
  limit?: number;
  name?: string;
  email?: string;
  role?: string;
  platformRoleId?: string;
  platformRoleName?: string;
  companyId?: string;
  organizationId?: string;
  managerId?: string;
  isActive?: boolean;
  searchTerm?: string;
}
