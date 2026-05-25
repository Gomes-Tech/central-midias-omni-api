import { CreateTagDTO, FindAllTagsFiltersDTO, UpdateTagDTO } from '../dto';
import { TagEntity } from '../entities';

export function makeCreateTagDTO(
  overrides: Partial<CreateTagDTO> = {},
): CreateTagDTO {
  return {
    name: 'Campanha',
    ...overrides,
  };
}

export function makeUpdateTagDTO(
  overrides: Partial<UpdateTagDTO> = {},
): UpdateTagDTO {
  return {
    ...overrides,
  };
}

export function makeFindAllTagsFiltersDTO(
  overrides: Partial<FindAllTagsFiltersDTO> = {},
): FindAllTagsFiltersDTO {
  return {
    ...overrides,
  };
}

export function makeTagEntity(overrides: Partial<TagEntity> = {}): TagEntity {
  const now = new Date('2024-01-01T00:00:00.000Z');

  return {
    id: 'tag-id',
    organizationId: 'organization-id',
    name: 'Campanha',
    createdAt: now,
    updatedAt: now,
    materialsCount: 0,
    tagSearchesCount: 0,
    ...overrides,
  };
}
