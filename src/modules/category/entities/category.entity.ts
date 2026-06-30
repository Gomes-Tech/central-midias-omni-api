export interface CategoryListItem {
  id: string;
  name: string;
  slug: string;
  slugPath: string;
  isActive: boolean;
  hasExternalLink: boolean;
  externalLink?: string | null;
  order: number;
  parentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryTreeItem {
  id: string;
  name: string;
  slug: string;
  slugPath: string;
  isActive: boolean;
  hasExternalLink: boolean;
  externalLink?: string | null;
  order: number;
  parentId?: string | null;
  children: CategoryTreeItem[];
}

export interface CategoryDetails {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  slugPath: string;
  isActive: boolean;
  order: number;
  parentId?: string | null;
  hasExternalLink: boolean;
  externalLink?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  parent?: {
    id: string;
    name: string;
    slug: string;
    slugPath: string;
  } | null;
  children: Array<{
    id: string;
    name: string;
    slug: string;
    slugPath: string;
    isActive: boolean;
    order: number;
  }>;
}
