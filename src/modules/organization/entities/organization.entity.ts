export interface OrganizationEntity {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  shouldAttachUsersByDomain?: boolean;
  avatarKey?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface OrganizationList {
  id: string;
  name: string;
  avatarUrl: string | null;
  isActive: boolean;
  slug: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  createdAt: Date;
}
