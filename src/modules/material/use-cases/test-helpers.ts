import {
  CreateMaterialDTO,
  FindAllMaterialsFiltersDTO,
  UpdateMaterialDTO,
} from '../dto';
import {
  MaterialDetails,
  MaterialFileItem,
  MaterialListItem,
  MaterialTagSummary,
} from '../entities';

export function makeCreateMaterialDTO(
  overrides: Partial<CreateMaterialDTO> = {},
): CreateMaterialDTO {
  return {
    name: 'Material institucional',
    description: '<p>Descricao</p>',
    categoryId: 'category-id',
    tags: ['Campanha'],
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
    tags: [makeMaterialTagSummary()],
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

export function makeMaterialFile(
  overrides: Partial<MaterialFileItem> = {},
): MaterialFileItem {
  return {
    id: 'material-file-id',
    materialId: 'material-id',
    fileKey: 'materials/material-id/file.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    ...overrides,
  };
}

export function makeMaterialTagSummary(
  overrides: Partial<MaterialTagSummary> = {},
): MaterialTagSummary {
  return {
    id: 'tag-id',
    name: 'Campanha',
    ...overrides,
  };
}

export function makeUploadFile(
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  return {
    fieldname: 'files',
    originalname: 'arquivo.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('file'),
    destination: '',
    filename: '',
    path: '',
    stream: undefined,
    ...overrides,
  } as Express.Multer.File;
}
