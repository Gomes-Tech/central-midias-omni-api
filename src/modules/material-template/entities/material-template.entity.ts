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

export interface MaterialTemplateTextRun {
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
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

export interface MaterialTemplateTextLayerV2 {
  id: string;
  type: 'text';
  name: string;
  runs: MaterialTemplateTextRun[];
  x: number;
  y: number;
  rotation: number;
  isVisible: boolean;
  editableProperties: Array<'content'>;
  profileBinding: MaterialTemplateProfileBinding | null;
}

export interface MaterialTemplateAssetLayerV2 extends Omit<
  MaterialTemplateAssetLayer,
  'editableProperties'
> {
  editableProperties: [];
}

export interface MaterialTemplateImagePlaceholderLayer {
  id: string;
  type: 'image-placeholder';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isVisible: boolean;
  editableProperties: ['image'];
}

export type MaterialTemplateLayerV2 =
  | MaterialTemplateTextLayerV2
  | MaterialTemplateAssetLayerV2
  | MaterialTemplateImagePlaceholderLayer;

export interface MaterialTemplateDocumentV2 {
  version: 2;
  canvas: MaterialTemplateCanvas;
  layerOrder: string[];
  layers: MaterialTemplateLayerV2[];
}

export type MaterialTemplateDocument =
  | MaterialTemplateDocumentV1
  | MaterialTemplateDocumentV2;

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
  size: number;
  width: number | null;
  height: number | null;
}

export interface MaterialTemplateBaseImage {
  id: string;
  url: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
}

export type MaterialExportType = 'png' | 'jpg' | 'pdf' | 'print_pdf';

export interface MaterialTemplateDelivery {
  exportTypes: MaterialExportType[];
  digital: null | { mimeTypes: Array<'image/png' | 'image/jpeg'> };
  print: null | { presetId: string };
}

export interface MaterialTemplatePrintPreset {
  id: string;
  name: string;
  trimWidthMm: number;
  trimHeightMm: number;
  bleedTopMm: number;
  bleedRightMm: number;
  bleedBottomMm: number;
  bleedLeftMm: number;
  safeMarginTopMm: number;
  safeMarginRightMm: number;
  safeMarginBottomMm: number;
  safeMarginLeftMm: number;
  minimumDpi: number;
  includeCropMarks: boolean;
  cropMarkOffsetMm: number;
  renderingIntent: string;
  isActive: boolean;
  updatedAt: Date;
  colorProfile: {
    id: string;
    name: string;
    checksum: string;
    outputConditionIdentifier: string;
    isActive: boolean;
  };
}

export interface MaterialTemplatePrintPreflight {
  status: 'PENDING' | 'READY' | 'FAILED';
  issues: Array<{ code: string; message: string; layerId?: string }>;
  checkedAt: Date | null;
  templateRevision: number;
  presetUpdatedAt: Date;
}

export interface MaterialTemplateResponse {
  id: string;
  materialId: string;
  status: MaterialTemplateStatus;
  schemaVersion: number;
  document: MaterialTemplateDocument | null;
  legacyImport: LegacyMaterialTemplateImport | null;
  revision: number;
  publishedAt: Date | null;
  updatedAt: Date;
  delivery: MaterialTemplateDelivery;
  printPreset: MaterialTemplatePrintPreset | null;
  printPreflight: MaterialTemplatePrintPreflight | null;
  baseImage: MaterialTemplateBaseImage | null;
  assets: MaterialTemplateResolvedAsset[];
  missingAssetIds: string[];
}
