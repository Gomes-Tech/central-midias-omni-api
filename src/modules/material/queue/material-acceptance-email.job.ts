export interface MaterialAcceptanceEmailJobPayload {
  materialId: string;
  organizationId: string;
  userId: string;
  email: string;
  name: string;
  materialName: string;
  materialLink?: string;
}
