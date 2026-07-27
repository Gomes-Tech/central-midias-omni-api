export interface CalendarEventTypeEntity {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
