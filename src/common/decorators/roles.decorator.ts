import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to set roles metadata for a route handler.
 * @param roles - The roles to be assigned to the route handler.
 * @returns A function that sets the roles metadata.
 */

export const ROLES_KEY = 'roles';
export const Roles = (...role: string[]) => SetMetadata(ROLES_KEY, role);
