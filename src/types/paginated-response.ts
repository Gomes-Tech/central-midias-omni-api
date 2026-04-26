export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  totalPages: number;
  page: number;
}
