export interface OrganizationEntity {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  shouldAttachUsersByDomain?: boolean;
  avatarKey?: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface OrganizationList {
  id: string;
  name: string;
  avatarUrl: string | null;
  isActive: boolean;
  slug: string;
  createdAt: Date;
}
