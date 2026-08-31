export type NotificationType =
  | 'MATERIAL_CREATED'
  | 'MATERIAL_UPDATED'
  | 'CATEGORY_CREATED';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  resourceType: string;
  resourceId: string;
  readAt: Date | null;
  createdAt: Date;
}

export interface CreateNotificationInput {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  resourceType: string;
  resourceId: string;
  actorUserId?: string;
  dedupeKey: string;
}
