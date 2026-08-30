import { NotificationType } from '../entities';

export interface InAppNotificationJobPayload {
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
