export interface FindAllUsersFilters {
  page?: number;
  limit?: number;
  role?: string;
  companyId?: string;
  isActive?: boolean;
  searchTerm?: string;
}
