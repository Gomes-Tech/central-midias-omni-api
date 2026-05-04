import {
  CreateMaterialDTO,
  FindAllMaterialsFiltersDTO,
  UpdateMaterialDTO,
} from '../dto';
import { MaterialDetails, MaterialListItem } from '../entities';

export function makeCreateMaterialDTO(
  overrides: Partial<CreateMaterialDTO> = {},
): CreateMaterialDTO {
  return {
    name: 'Material institucional',
    description: '<p>Descricao</p>',
    categoryId: 'category-id',
    ...overrides,
  };
}

export function makeUpdateMaterialDTO(
  overrides: Partial<UpdateMaterialDTO> = {},
): UpdateMaterialDTO {
  return {
    ...overrides,
  };
}

export function makeFindAllMaterialsFiltersDTO(
  overrides: Partial<FindAllMaterialsFiltersDTO> = {},
): FindAllMaterialsFiltersDTO {
  return {
    ...overrides,
  };
}

export function makeMaterialListItem(
  overrides: Partial<MaterialListItem> = {},
): MaterialListItem {
  const now = new Date('2024-01-01T00:00:00.000Z');

  return {
    id: 'material-id',
    name: 'Material institucional',
    description: 'Descricao',
    categoryId: 'category-id',
    createdAt: now,
    updatedAt: now,
    category: {
      id: 'category-id',
      name: 'Categoria',
      slug: 'categoria',
    },
    materialFilesCount: 0,
    ...overrides,
  };
}

export function makeMaterialDetails(
  overrides: Partial<MaterialDetails> = {},
): MaterialDetails {
  return {
    ...makeMaterialListItem(),
    deletedAt: null,
    ...overrides,
  };
}
