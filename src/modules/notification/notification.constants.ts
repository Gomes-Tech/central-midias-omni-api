export const NOTIFICATION_WS_NAMESPACE = '/notifications';

export const NOTIFICATION_CREATED_EVENT = 'notification.created';

export function buildNotificationRoom(
  userId: string,
  organizationId: string,
): string {
  return `user:${userId}:org:${organizationId}`;
}

export function isSocketCorsOriginAllowed(origin?: string): boolean {
  if (!origin) {
    return true;
  }

  const raw = (process.env.ALLOWED_ORIGINS || '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/\/+$/, '');

  const allowedOrigins = raw
    ? raw
        .split(',')
        .map((item) =>
          item
            .trim()
            .replace(/^["']+|["']+$/g, '')
            .replace(/\/+$/, ''),
        )
        .filter((item) => item.length > 0)
    : [];

  if (allowedOrigins.length === 0) {
    return process.env.NODE_ENV !== 'prod';
  }

  const normalized = origin.trim().replace(/\/+$/, '');
  return allowedOrigins.some(
    (allowed) => allowed === normalized || allowed === origin,
  );
}
