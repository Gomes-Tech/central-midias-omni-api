import type {
  MaterialTemplateDocumentV2,
  MaterialTemplateDocumentV3,
} from '@modules/material-template';

export interface PrintExportJobPayload {
  exportId: string;
  document: MaterialTemplateDocumentV2 | MaterialTemplateDocumentV3;
  inputIds?: string[];
}

export const PRINT_EXPORT_CLEANUP_JOB = 'expire-pdfs';
