export interface MaterialCategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface MaterialTagSummary {
  id: string;
  name: string;
}

export interface MaterialListItem {
  id: string;
  name: string;
  description?: string | null;
  category: {
    name: string;
  };
  materialFilesCount: number;
}

export interface MaterialFileItem {
  id: string;
  materialId: string;
  fileKey: string;
  mimeType: string;
  size: number;
}

export interface MaterialFileWithUrl extends Omit<MaterialFileItem, 'fileKey'> {
  url: string;
}

export interface MaterialCustomizationDetails {
  position: 'TOP' | 'FOOTER';
  hasPhonePrimary: boolean;
  hasPhoneSecondary: boolean;
  hasAddress: boolean;
  hasCity: boolean;
}

export interface MaterialDetails {
  id: string;
  name: string;
  description?: string | null;
  categoryId: string;
  requiresAcceptance: boolean;
  hasExternalLink: boolean;
  externalLink?: string | null;
  isCustomizable: boolean;
  customization: MaterialCustomizationDetails | null;
  createdAt: Date;
  updatedAt: Date;
  category: MaterialCategorySummary;
  tags: string[];
  materialFilesCount: number;
  deletedAt?: Date | null;
  currentUserAcceptedAt?: Date | null;
}

export interface MaterialAcceptanceReportRow {
  name: string;
  email: string;
  viewed: boolean;
  acceptedAt: Date | null;
}

export interface MostAccessedMaterialItem {
  id: string;
  name: string;
  description?: string | null;
  imageUrl: string | null;
}

export interface MaterialMosaicItem {
  id: string;
  imageUrl: string | null;
}

export interface MaterialByCategorySlugItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  mimeType: string | null;
  size: number | null;
  externalLink: string | null;
  isCustomizable: boolean;
}

export interface MaterialByCategorySlugRow {
  id: string;
  name: string;
  description: string | null;
  externalLink: string | null;
  isCustomizable: boolean;
  imageKey: string | null;
  mimeType: string | null;
  size: number | null;
}
