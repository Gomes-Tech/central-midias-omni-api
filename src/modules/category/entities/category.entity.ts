export interface CategoryListItem {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  order: number;
  parentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryTreeItem {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  order: number;
  parentId?: string | null;
  children: CategoryTreeItem[];
}

export interface CategoryDetails {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  isActive: boolean;
  order: number;
  parentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  parent?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  children: Array<{
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    order: number;
  }>;
}
