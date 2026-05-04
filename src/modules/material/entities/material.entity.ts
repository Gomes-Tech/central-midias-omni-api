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

// Faz sentido manter o mapeamento. Retorno da query:

// const materials: {
//   id: string;
//   name: string;
//   description: string;
//   createdAt: Date;
//   updatedAt: Date;
//   categoryId: string;
//   category: {
//     id: string;
//     name: string;
//     slug: string;
//   };
//   _count: {
//     materialFiles: number;
//   };
// }[];

export interface MaterialDetails extends MaterialListItem {
  deletedAt?: Date | null;
}
