import { UserRole } from 'types/role';

export interface FindAllUsersFilters {
  page?: number;
  limit?: number;
  name?: string;
  email?: string;
  role?: UserRole;
  companyId?: string;
  isActive?: boolean;
  isEmployee?: boolean;
}
