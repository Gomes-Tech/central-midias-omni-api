export type MaterialTemplateStatus = 'DRAFT' | 'PUBLISHED';

export type MaterialTemplateProfileBinding =
  | 'NAME'
  | 'PHONE'
  | 'CITY'
  | 'UF'
  | 'CITY_UF';

export interface MaterialTemplateCanvas {
  width: number;
  height: number;
}

export interface MaterialTemplateTextLayer {
  id: string;
  type: 'text';
  name: string;
  value: string;
  x: number;
  y: number;
  rotation: number;
  fontSize: number;
  fontFamily: string;
  fill: string;
  isVisible: boolean;
  editableProperties: Array<'value'>;
  profileBinding: MaterialTemplateProfileBinding | null;
}

export interface MaterialTemplateAssetLayer {
  id: string;
  type: 'asset';
  name: string;
  assetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isVisible: boolean;
  editableProperties: [];
}

export type MaterialTemplateLayer =
  | MaterialTemplateTextLayer
  | MaterialTemplateAssetLayer;

export interface MaterialTemplateDocumentV1 {
  version: 1;
  canvas: MaterialTemplateCanvas;
  layerOrder: string[];
  layers: MaterialTemplateLayer[];
}

export interface LegacyMaterialTemplateImport {
  position: 'TOP' | 'FOOTER';
  hasPhonePrimary: boolean;
  hasPhoneSecondary: boolean;
  hasAddress: boolean;
  hasCity: boolean;
}

export interface MaterialTemplateResolvedAsset {
  id: string;
  name: string;
  url: string;
  mimeType: string;
}

export interface MaterialTemplateBaseImage {
  id: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface MaterialTemplateResponse {
  id: string;
  materialId: string;
  status: MaterialTemplateStatus;
  schemaVersion: number;
  document: MaterialTemplateDocumentV1 | null;
  legacyImport: LegacyMaterialTemplateImport | null;
  revision: number;
  publishedAt: Date | null;
  updatedAt: Date;
  baseImage: MaterialTemplateBaseImage | null;
  assets: MaterialTemplateResolvedAsset[];
  missingAssetIds: string[];
}
