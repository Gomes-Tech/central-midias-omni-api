import { CreateCategoryDTO, UpdateCategoryDTO } from '../dto';
import { CategoryDetails } from '../entities';

export function makeCreateCategoryDTO(
  overrides: Partial<CreateCategoryDTO> = {},
): CreateCategoryDTO {
  return {
    name: 'Categoria',
    slug: 'categoria',
    order: 0,
    isActive: true,
    ...overrides,
  };
}

export function makeUpdateCategoryDTO(
  overrides: Partial<UpdateCategoryDTO> = {},
): UpdateCategoryDTO {
  return {
    ...overrides,
  };
}

export function makeCategoryDetails(
  overrides: Partial<CategoryDetails> = {},
): CategoryDetails {
  const now = new Date('2024-01-01T00:00:00.000Z');
  return {
    id: 'category-id',
    organizationId: 'org-id',
    name: 'Categoria',
    slug: 'categoria',
    isActive: true,
    order: 0,
    parentId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    parent: null,
    children: [],
    ...overrides,
  };
}
