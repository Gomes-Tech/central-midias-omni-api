import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

export interface RequiredPermission {
  category: string;
  action: string;
}

export const RequirePermission = (category: string, action: string) =>
  SetMetadata(PERMISSION_KEY, {
    category,
    action,
  } satisfies RequiredPermission);
