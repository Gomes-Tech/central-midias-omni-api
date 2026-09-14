import type { MaterialTemplateDocumentV2 } from '@modules/material-template';

export interface PrintExportJobPayload {
  exportId: string;
  document: MaterialTemplateDocumentV2;
  inputIds?: string[];
}

export const PRINT_EXPORT_CLEANUP_JOB = 'expire-pdfs';
