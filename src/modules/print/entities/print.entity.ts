import type {
  PrintExportStatus,
  PrintPreflightStatus,
  PrintRenderingIntent,
} from '@prisma/client';

export interface PrintPresetSnapshot {
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
  renderingIntent: PrintRenderingIntent;
  updatedAt: string;
  colorProfile: {
    id: string;
    name: string;
    storageKey: string;
    checksum: string;
    outputConditionIdentifier: string;
  };
}

export interface PrintPreflightIssue {
  code: string;
  message: string;
  layerId?: string;
}

export interface PrintPreflightResult {
  status: PrintPreflightStatus;
  issues: PrintPreflightIssue[];
  checkedAt: Date | null;
  templateRevision: number;
  presetUpdatedAt: Date;
}

export interface PrintExportResponse {
  id: string;
  materialId: string;
  status: PrintExportStatus;
  progress: number;
  errorCode: string | null;
  errorMessage: string | null;
  size: number | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
