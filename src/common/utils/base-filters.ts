export interface BaseFindFilters<T, K> {
  where?: T;
  orderBy?: {
    field: keyof K; // ex: 'name', 'createdAt', etc
    direction: 'asc' | 'desc';
  };
  skip?: number; // para pular X itens (offset)
  take?: number; // quantidade máxima de itens a retornar (limit)
}
