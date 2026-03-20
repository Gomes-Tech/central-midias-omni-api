export const userRoles = {
  ADMIN: 'ADMIN',
  COLLABORATOR: 'COLLABORATOR',
  OWN_DIRECT_CHANNEL: 'OWN_DIRECT_CHANNEL',
  AGENT_DIRECT_CHANNEL: 'AGENT_DIRECT_CHANNEL',
  SMALL_MASTER_AGENT: 'SMALL_MASTER_AGENT',
  MEDIUM_MASTER_AGENT: 'MEDIUM_MASTER_AGENT',
  LARGE_MASTER_AGENT: 'LARGE_MASTER_AGENT',
  PARTNER: 'PARTNER',
  AGENT_EMPLOYEE: 'AGENT_EMPLOYEE',
};

export type UserRole = (typeof userRoles)[keyof typeof userRoles];

export const roles = userRoles;

export type Role = UserRole;

const roleHierarchy: Record<UserRole, number> = {
  ADMIN: 8,
  COLLABORATOR: 7,
  OWN_DIRECT_CHANNEL: 6,
  AGENT_DIRECT_CHANNEL: 5,
  SMALL_MASTER_AGENT: 4,
  MEDIUM_MASTER_AGENT: 3,
  LARGE_MASTER_AGENT: 2,
  PARTNER: 1,
  AGENT_EMPLOYEE: 0,
};

export function getHighestUserRole(
  availableRoles: Array<UserRole | string>,
): UserRole | null {
  const normalizedRoles = availableRoles.filter(
    (role): role is UserRole => role in roleHierarchy,
  );

  if (!normalizedRoles.length) {
    return null;
  }

  return normalizedRoles.sort(
    (currentRole, nextRole) =>
      roleHierarchy[nextRole] - roleHierarchy[currentRole],
  )[0];
}
