import { CreateEventDTO } from '../dto';
import { CalendarEventEntity } from '../entities';

export function makeCreateEventDTO(
  overrides: Partial<CreateEventDTO> = {},
): CreateEventDTO {
  return {
    title: 'Campanha Dia das Mães',
    description: 'Materiais disponíveis',
    startDate: new Date('2026-08-01T00:00:00.000Z'),
    endDate: new Date('2026-08-10T23:59:59.000Z'),
    eventTypeId: 'event-type-1',
    ...overrides,
  };
}

export function makeEventEntity(
  overrides: Partial<CalendarEventEntity> = {},
): CalendarEventEntity {
  return {
    id: 'event-1',
    organizationId: 'org-1',
    title: 'Campanha Dia das Mães',
    description: 'Materiais disponíveis',
    startDate: new Date('2026-08-01T00:00:00.000Z'),
    endDate: new Date('2026-08-10T23:59:59.000Z'),
    externalUrl: null,
    eventTypeId: 'event-type-1',
    eventType: {
      id: 'event-type-1',
      name: 'Campanha',
      slug: 'campanha',
      color: '#EA580C',
    },
    materials: [],
    createdBy: { id: 'user-1', name: 'Admin' },
    isActive: true,
    createdAt: new Date('2026-04-01T10:00:00.000Z'),
    updatedAt: new Date('2026-04-01T10:00:00.000Z'),
    ...overrides,
  };
}

export function makeMemberRole(
  overrides: {
    roleId?: string;
    canAccessBackoffice?: boolean;
    categoryRoleAccesses?: Array<{ categoryId: string }>;
  } = {},
) {
  return {
    roleId: overrides.roleId ?? 'role-1',
    name: 'EDITOR',
    label: 'Editor',
    canAccessBackoffice: overrides.canAccessBackoffice ?? false,
    permissions: [],
    categoryRoleAccesses: (overrides.categoryRoleAccesses ?? []).map(
      (access, index) => ({
        id: `cra-${index}`,
        categoryId: access.categoryId,
        organizationId: 'org-1',
        category: {
          id: access.categoryId,
          name: 'Cat',
          slug: 'cat',
        },
      }),
    ),
  };
}
