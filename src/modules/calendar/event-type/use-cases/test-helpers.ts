import { CreateEventTypeDTO, UpdateEventTypeDTO } from '../dto';
import { CalendarEventTypeEntity } from '../entities';

export function makeCreateEventTypeDTO(
  overrides: Partial<CreateEventTypeDTO> = {},
): CreateEventTypeDTO {
  return {
    name: 'Feriado',
    color: '#DC2626',
    ...overrides,
  };
}

export function makeUpdateEventTypeDTO(
  overrides: Partial<UpdateEventTypeDTO> = {},
): UpdateEventTypeDTO {
  return {
    name: 'Campanha',
    ...overrides,
  };
}

export function makeEventTypeEntity(
  overrides: Partial<CalendarEventTypeEntity> = {},
): CalendarEventTypeEntity {
  return {
    id: 'event-type-1',
    organizationId: 'org-1',
    name: 'Feriado',
    slug: 'feriado',
    color: '#DC2626',
    description: null,
    order: 0,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}
