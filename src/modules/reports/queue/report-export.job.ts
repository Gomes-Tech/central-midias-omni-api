import { ReportType } from '../entities';

export interface ReportExportJobPayload {
  reportType: ReportType;
  organizationId: string;
  userId: string;
  email: string;
  name: string;
}
