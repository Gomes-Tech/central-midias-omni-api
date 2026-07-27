export interface CalendarEventTypeSummary {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export interface CalendarEventCategorySummary {
  id: string;
  name: string;
  slug: string;
  slugPath: string;
}

export interface CalendarEventMaterialSummary {
  id: string;
  name: string;
  category: CalendarEventCategorySummary;
}

export interface CalendarEventAuthorSummary {
  id: string;
  name: string;
}

export interface CalendarEventEntity {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  externalUrl: string | null;
  eventTypeId: string;
  eventType: CalendarEventTypeSummary;
  materials: CalendarEventMaterialSummary[];
  createdBy: CalendarEventAuthorSummary | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
