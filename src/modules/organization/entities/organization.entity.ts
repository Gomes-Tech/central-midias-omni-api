export interface OrganizationEntity {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  shouldAttachUsersByDomain?: boolean;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
