export interface MaterialCategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface MaterialListItem {
  id: string;
  name: string;
  description?: string | null;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
  category: MaterialCategorySummary;
  materialFilesCount: number;
}

export interface MaterialDetails extends MaterialListItem {
  deletedAt?: Date | null;
}
