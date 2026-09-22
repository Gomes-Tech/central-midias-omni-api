import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import {
  MaterialTemplateStatus,
  PrintExportStatus,
  Prisma,
} from '@prisma/client';
import { PaginatedResponse } from '../../../types';
import {
  CreateMaterialDTO,
  FindAllMaterialsFiltersDTO,
  FindMaterialsByCategorySlugFiltersDTO,
  SearchMaterialsFiltersDTO,
  UpdateMaterialDTO,
} from '../dto';
import { resolveTemplateExportConfig } from '../dto/material-export-types';
import type { MaterialExportType } from '../dto/material-export-types';
import {
  MaterialAcceptanceReportRow,
  MaterialByCategorySlugRow,
  MaterialDetails,
  MaterialFileItem,
  MaterialListItem,
} from '../entities';
import {
  CUSTOMIZABLE_DELETE_PRINT_EXPORT_MESSAGE,
  CUSTOMIZABLE_IMAGE_COUNT_MESSAGE,
  CUSTOMIZABLE_LAST_IMAGE_MESSAGE,
  CUSTOMIZABLE_PRINT_EXPORT_IN_PROGRESS_MESSAGE,
  MAX_CUSTOMIZABLE_MATERIAL_IMAGES,
} from '../material.constants';
import type { ResolvedMaterialTags } from '../use-cases/resolve-material-tags.use-case';
import { normalizeSearchTerm } from '../utils/normalize-search-term';

const materialListSelect = {
  id: true,
  name: true,
  description: true,
  category: {
    select: {
      name: true,
    },
  },
  materialFiles: {
    select: {
      id: true,
    },
  },
  isCustomizable: true,
  materialTemplate: { select: { status: true } },
} satisfies Prisma.MaterialSelect;

const buildMaterialDetailsSelect = (organizationId: string) =>
  ({
    id: true,
    name: true,
    description: true,
    categoryId: true,
    requiresAcceptance: true,
    hasExternalLink: true,
    externalLink: true,
    hasTextCopy: true,
    onlyView: true,
    textCopy: true,
    isCustomizable: true,
    materialTemplate: {
      select: {
        status: true,
        allowedExportTypes: true,
        printPresetId: true,
      },
    },
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
    category: {
      select: {
        id: true,
        name: true,
        slug: true,
      },
    },
    tags: {
      where: {
        organizationId,
      },
      select: {
        id: true,
      },
      orderBy: [{ name: 'asc' }],
    },
    materialFiles: {
      select: {
        id: true,
        mimeType: true,
      },
    },
  }) satisfies Prisma.MaterialSelect;

const materialFileSelect = {
  id: true,
  materialId: true,
  imageKey: true,
  originalName: true,
  mimeType: true,
  size: true,
  width: true,
  height: true,
  sortOrder: true,
} satisfies Prisma.MaterialFileSelect;

type MaterialFileRow = Prisma.MaterialFileGetPayload<{
  select: typeof materialFileSelect;
}>;

const materialMostAccessedSelect = {
  id: true,
  name: true,
  description: true,
  categoryId: true,
  materialFiles: {
    select: materialFileSelect,
  },
} satisfies Prisma.MaterialSelect;

export type MaterialMostAccessedRow = Prisma.MaterialGetPayload<{
  select: typeof materialMostAccessedSelect;
}>;

const imageMaterialFilesFilter = {
  some: {
    mimeType: {
      startsWith: 'image/',
    },
  },
} satisfies Prisma.MaterialFileListRelationFilter;

const buildImageMaterialWhere = (
  categoryWhere: Prisma.CategoryWhereInput,
  excludeIds: string[] = [],
): Prisma.MaterialWhereInput => ({
  deletedAt: null,
  category: categoryWhere,
  materialFiles: imageMaterialFilesFilter,
  ...(excludeIds.length > 0 && {
    id: { notIn: excludeIds },
  }),
});

export interface CreateMaterialFileInput {
  id: string;
  fileKey: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  sortOrder: number;
}

export interface CustomizableUploadContext {
  templateId: string;
  revision: number;
  document: unknown;
  files: Array<{
    id: string;
    width: number | null;
    height: number | null;
    sortOrder: number;
  }>;
  activePrintExportCount: number;
}

export interface AddCustomizableFilesOptions {
  templateId: string;
  revision: number;
  document: unknown;
  existingFileIds: string[];
}

export interface DeleteCustomizableFileOptions {
  templateId: string;
  revision: number;
  document: unknown;
  assetIds: string[];
  existingFileIds: string[];
}

export interface CreateMaterialOptions {
  id?: string;
  files?: CreateMaterialFileInput[];
  tags?: ResolvedMaterialTags;
}

export interface UpdateMaterialOptions {
  tags?: ResolvedMaterialTags;
  activateTemplate?: {
    baseMaterialFileId: string;
    baseMimeType: string;
    validatedFiles: Array<{
      id: string;
      mimeType: 'image/png' | 'image/jpeg';
      width: number;
      height: number;
    }>;
  };
}

@Injectable()
export class MaterialRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(
    filters: FindAllMaterialsFiltersDTO = {},
    organizationId: string,
  ): Promise<PaginatedResponse<MaterialListItem>> {
    const {
      page = 1,
      limit = 25,
      categoryId,
      searchTerm,
      requiresAcceptance,
    } = filters;
    const skip = (page - 1) * limit;

    try {
      const where: Prisma.MaterialWhereInput = {
        deletedAt: null,
        category: {
          organizationId,
          isDeleted: false,
        },
        ...(categoryId && { categoryId }),
        ...(requiresAcceptance !== undefined && { requiresAcceptance }),
        ...(searchTerm && {
          OR: [
            {
              name: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          ],
        }),
      };

      const [materials, total] = await Promise.all([
        this.prisma.material.findMany({
          where,
          select: materialListSelect,
          orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
          skip,
          take: limit,
        }),
        this.prisma.material.count({ where }),
      ]);

      return {
        data: materials.map((material) => ({
          id: material.id,
          name: material.name,
          description: material.description,
          category: material.category,
          materialFilesCount: material.materialFiles.length,
          isCustomizable: material.isCustomizable,
          templateStatus: material.materialTemplate?.status ?? null,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      void this.logger.error('MaterialRepository.findAll falhou', {
        error: String(error),
        organizationId,
        categoryId,
        searchTerm,
      });

      throw new BadRequestException('Erro ao buscar materiais');
    }
  }

  async findByCategorySlugPath(
    organizationId: string,
    slugPath: string,
    filters: FindMaterialsByCategorySlugFiltersDTO = {},
  ): Promise<PaginatedResponse<MaterialByCategorySlugRow>> {
    const { page = 1, limit = 24, searchTerm, sortOrder } = filters;
    const skip = (page - 1) * limit;
    const createdAtOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    try {
      const where: Prisma.MaterialWhereInput = {
        deletedAt: null,
        category: {
          organizationId,
          slugPath,
          isDeleted: false,
        },
        ...(searchTerm && {
          OR: [
            {
              name: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          ],
        }),
      };

      const [materials, total] = await Promise.all([
        this.prisma.material.findMany({
          where,
          select: {
            id: true,
            name: true,
            description: true,
            externalLink: true,
            hasTextCopy: true,
            onlyView: true,
            textCopy: true,
            isCustomizable: true,
            materialTemplate: { select: { status: true } },
            requiresAcceptance: true,
            materialFiles: {
              select: {
                imageKey: true,
                mimeType: true,
                size: true,
              },
              take: 1,
            },
          },
          orderBy: [{ createdAt: createdAtOrder }, { id: createdAtOrder }],
          skip,
          take: limit,
        }),
        this.prisma.material.count({ where }),
      ]);

      return {
        data: materials.map((material) => {
          const file = material.materialFiles[0];

          return {
            id: material.id,
            name: material.name,
            description: material.description,
            externalLink: material.externalLink || null,
            hasTextCopy: material.hasTextCopy,
            onlyView: material.onlyView,
            textCopy: material.textCopy,
            isCustomizable: material.isCustomizable,
            canCustomize:
              material.isCustomizable &&
              material.materialTemplate?.status ===
                MaterialTemplateStatus.PUBLISHED,
            requiresAcceptance: material.requiresAcceptance,
            imageKey: file?.imageKey ?? null,
            mimeType: file?.mimeType ?? null,
            size: file?.size ?? null,
          };
        }),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      void this.logger.error(
        'MaterialRepository.findByCategorySlugPath falhou',
        {
          error: String(error),
          organizationId,
          slugPath,
          searchTerm,
        },
      );

      throw new BadRequestException('Erro ao buscar materiais dessa categoria');
    }
  }

  async search(
    organizationId: string,
    userId: string,
    filters: SearchMaterialsFiltersDTO = {},
  ): Promise<PaginatedResponse<MaterialByCategorySlugRow>> {
    const { page = 1, limit = 24, term, searchId } = filters;

    if (!term?.trim()) {
      return { data: [], total: 0, page, totalPages: 0 };
    }

    const search = term.trim();

    try {
      const categoryWhere = await this.buildAccessibleCategoryWhere(
        organizationId,
        userId,
      );

      if (!categoryWhere) {
        return { data: [], total: 0, page, totalPages: 0 };
      }

      const skip = (page - 1) * limit;

      const where: Prisma.MaterialWhereInput = {
        deletedAt: null,
        category: categoryWhere,
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            tags: {
              some: {
                organizationId,
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          },
        ],
      };

      const [materials, total] = await Promise.all([
        this.prisma.material.findMany({
          where,
          select: {
            id: true,
            name: true,
            description: true,
            externalLink: true,
            hasTextCopy: true,
            onlyView: true,
            textCopy: true,
            isCustomizable: true,
            requiresAcceptance: true,
            materialFiles: {
              select: {
                imageKey: true,
                mimeType: true,
                size: true,
              },
              take: 1,
            },
            materialTemplate: { select: { status: true } },
          },
          orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
          skip,
          take: limit,
        }),
        this.prisma.material.count({ where }),
      ]);

      if (page === 1 && total > 0) {
        await this.registerSearchMetrics({
          organizationId,
          userId,
          searchId: searchId ?? generateId(),
          search,
          materialWhere: where,
        });
      }

      return {
        data: materials.map((material) => {
          const file = material.materialFiles[0];

          return {
            id: material.id,
            name: material.name,
            description: material.description,
            externalLink: material.externalLink || null,
            hasTextCopy: material.hasTextCopy,
            onlyView: material.onlyView,
            textCopy: material.textCopy,
            isCustomizable: material.isCustomizable,
            canCustomize:
              material.isCustomizable &&
              material.materialTemplate?.status ===
                MaterialTemplateStatus.PUBLISHED,
            requiresAcceptance: material.requiresAcceptance,
            imageKey: file?.imageKey ?? null,
            mimeType: file?.mimeType ?? null,
            size: file?.size ?? null,
          };
        }),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      void this.logger.error('MaterialRepository.search falhou', {
        error: String(error),
        organizationId,
        userId,
        term,
      });

      throw new BadRequestException('Erro ao buscar materiais');
    }
  }

  private async registerSearchMetrics(input: {
    organizationId: string;
    userId: string;
    searchId: string;
    search: string;
    materialWhere: Prisma.MaterialWhereInput;
  }): Promise<void> {
    const { organizationId, userId, searchId, search, materialWhere } = input;

    try {
      const tags = await this.prisma.tag.findMany({
        where: {
          organizationId,
          material: {
            some: materialWhere,
          },
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: [{ name: 'asc' }],
      });

      if (tags.length === 0) {
        return;
      }

      const term = normalizeSearchTerm(search);

      await this.prisma.tagSearch.createMany({
        data: tags.map((tag) => ({
          id: generateId(),
          searchId,
          organizationId,
          userId,
          term,
          search,
          tagId: tag.id,
          tagName: tag.name,
        })),
        skipDuplicates: true,
      });
    } catch (error) {
      void this.logger.error(
        'MaterialRepository.registerSearchMetrics falhou',
        {
          error: String(error),
          organizationId,
          userId,
          searchId,
          search,
        },
      );
    }
  }

  private async findActiveMember(
    organizationId: string,
    userId: string,
  ): Promise<{ roleId: string } | null> {
    return await this.prisma.member.findFirst({
      where: {
        organizationId,
        userId,
        user: { isActive: true, isDeleted: false },
      },
      select: { roleId: true },
    });
  }

  private async isGlobalAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true,
        isDeleted: false,
      },
      select: {
        globalRole: {
          select: {
            name: true,
            canAccessBackoffice: true,
          },
        },
      },
    });

    return (
      user?.globalRole?.name === 'ADMIN' && user.globalRole.canAccessBackoffice
    );
  }

  private async buildAccessibleCategoryWhere(
    organizationId: string,
    userId: string,
  ): Promise<Prisma.CategoryWhereInput | null> {
    const member = await this.findActiveMember(organizationId, userId);
    const canViewAllCategories = await this.isGlobalAdmin(userId);

    if (!member && !canViewAllCategories) {
      return null;
    }

    return {
      organizationId,
      isDeleted: false,
      ...(!canViewAllCategories &&
        member && {
          OR: [
            { categoryRoleAccesses: { none: {} } },
            {
              categoryRoleAccesses: {
                some: { roleId: member.roleId, organizationId },
              },
            },
          ],
        }),
    };
  }

  async findMostViewedMaterials(
    organizationId: string,
    userId: string,
    limit = 3,
  ): Promise<MaterialMostAccessedRow[]> {
    try {
      const categoryWhere = await this.buildAccessibleCategoryWhere(
        organizationId,
        userId,
      );

      if (!categoryWhere) {
        return [];
      }

      const imageMaterialWhere = buildImageMaterialWhere(categoryWhere);

      const viewed = await this.prisma.material.findMany({
        where: {
          ...imageMaterialWhere,
          materialViews: { some: {} },
        },
        orderBy: {
          materialViews: {
            _count: 'desc',
          },
        },
        take: limit,
        select: materialMostAccessedSelect,
      });

      if (viewed.length >= limit) {
        return viewed;
      }

      const fallback = await this.findLatestImageMaterialsPerCategory(
        organizationId,
        userId,
        limit - viewed.length,
        viewed.map((material) => material.id),
      );

      return [...viewed, ...fallback];
    } catch (error) {
      void this.logger.error(
        'MaterialRepository.findMostViewedMaterials falhou',
        {
          error: String(error),
          organizationId,
          userId,
        },
      );

      throw new BadRequestException('Erro ao buscar materiais mais acessados');
    }
  }

  async findLatestMaterialsPerCategory(
    organizationId: string,
    userId: string,
    limit = 3,
    excludeIds: string[] = [],
  ): Promise<MaterialMostAccessedRow[]> {
    try {
      const categoryWhere = await this.buildAccessibleCategoryWhere(
        organizationId,
        userId,
      );

      if (!categoryWhere) {
        return [];
      }

      const materials = await this.prisma.material.findMany({
        where: {
          deletedAt: null,
          category: categoryWhere,
          ...(excludeIds.length > 0 && {
            id: { notIn: excludeIds },
          }),
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: materialMostAccessedSelect,
      });

      const excludeSet = new Set(excludeIds);
      const seenCategories = new Set<string>();
      const selected: MaterialMostAccessedRow[] = [];

      for (const material of materials) {
        if (
          excludeSet.has(material.id) ||
          seenCategories.has(material.categoryId)
        ) {
          continue;
        }

        seenCategories.add(material.categoryId);
        selected.push(material);

        if (selected.length >= limit) {
          break;
        }
      }

      return selected;
    } catch (error) {
      void this.logger.error(
        'MaterialRepository.findLatestMaterialsPerCategory falhou',
        {
          error: String(error),
          organizationId,
          userId,
        },
      );

      throw new BadRequestException(
        'Erro ao buscar materiais recentes por categoria',
      );
    }
  }

  async findLatestImageMaterialsPerCategory(
    organizationId: string,
    userId: string,
    limit = 6,
    excludeIds: string[] = [],
  ): Promise<MaterialMostAccessedRow[]> {
    try {
      const categoryWhere = await this.buildAccessibleCategoryWhere(
        organizationId,
        userId,
      );

      if (!categoryWhere) {
        return [];
      }

      const imageMaterialWhere = buildImageMaterialWhere(
        categoryWhere,
        excludeIds,
      );
      const excludeSet = new Set(excludeIds);

      const latestPerCategory = await this.prisma.material.groupBy({
        by: ['categoryId'],
        where: imageMaterialWhere,
        _max: {
          createdAt: true,
        },
        orderBy: {
          _max: {
            createdAt: 'desc',
          },
        },
      });

      const topCategories = latestPerCategory.slice(0, limit);

      if (topCategories.length === 0) {
        return [];
      }

      const materials = await this.prisma.material.findMany({
        where: {
          ...imageMaterialWhere,
          OR: topCategories.map(({ categoryId, _max }) => ({
            categoryId,
            createdAt: _max.createdAt!,
          })),
        },
        select: materialMostAccessedSelect,
        orderBy: { createdAt: 'desc' },
      });

      const seenCategories = new Set<string>();
      const selected: MaterialMostAccessedRow[] = [];

      for (const material of materials) {
        if (
          excludeSet.has(material.id) ||
          seenCategories.has(material.categoryId)
        ) {
          continue;
        }

        seenCategories.add(material.categoryId);
        selected.push(material);

        if (selected.length >= limit) {
          break;
        }
      }

      if (selected.length >= limit) {
        return selected;
      }

      const additionalMaterials = await this.prisma.material.findMany({
        where: {
          ...imageMaterialWhere,
          id: {
            notIn: [...excludeIds, ...selected.map((material) => material.id)],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit - selected.length,
        select: materialMostAccessedSelect,
      });

      return [...selected, ...additionalMaterials];
    } catch (error) {
      void this.logger.error(
        'MaterialRepository.findLatestImageMaterialsPerCategory falhou',
        {
          error: String(error),
          organizationId,
          userId,
        },
      );

      throw new BadRequestException(
        'Erro ao buscar materiais recentes com imagem por categoria',
      );
    }
  }

  async findAllSelect(
    organizationId: string,
  ): Promise<{ id: string; name: string }[]> {
    try {
      return await this.prisma.material.findMany({
        where: {
          deletedAt: null,
          category: {
            organizationId,
            isDeleted: false,
          },
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
        },
      });
    } catch (error) {
      this.logger.error('MaterialRepository.findAllSelect falhou', {
        error: String(error),
        organizationId,
      });
      throw new BadRequestException('Erro ao buscar materiais (select)');
    }
  }

  async findById(
    id: string,
    organizationId: string,
    userId?: string,
  ): Promise<MaterialDetails | null> {
    try {
      const material = await this.prisma.material.findFirst({
        where: {
          id,
          deletedAt: null,
          category: {
            organizationId,
            isDeleted: false,
          },
        },
        select: {
          ...buildMaterialDetailsSelect(organizationId),
          ...(userId && {
            materialAcceptances: {
              where: { userId },
              select: { acceptedAt: true },
              take: 1,
            },
          }),
        },
      });

      return material
        ? {
            id: material.id,
            name: material.name,
            description: material.description,
            categoryId: material.categoryId,
            requiresAcceptance: material.requiresAcceptance,
            createdAt: material.createdAt,
            updatedAt: material.updatedAt,
            category: material.category,
            tags: material.tags.map((tag) => tag.id),
            materialFilesCount: material.materialFiles.length,
            mimeType: material.materialFiles[0]?.mimeType ?? null,
            hasExternalLink: material.hasExternalLink,
            externalLink: material.externalLink,
            hasTextCopy: material.hasTextCopy,
            onlyView: material.onlyView,
            textCopy: material.textCopy,
            isCustomizable: material.isCustomizable,
            templateStatus: material.materialTemplate?.status ?? null,
            exportTypes: (material.materialTemplate?.allowedExportTypes ??
              []) as MaterialExportType[],
            printPresetId: material.materialTemplate?.printPresetId ?? null,
            deletedAt: material.deletedAt,
            currentUserAcceptedAt:
              userId && 'materialAcceptances' in material
                ? (material.materialAcceptances[0]?.acceptedAt ?? null)
                : undefined,
          }
        : null;
    } catch (error) {
      void this.logger.error('MaterialRepository.findById falhou', {
        error: String(error),
        id,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar material');
    }
  }

  // Verificar se findByName realmente retorna somente id, name e categoryId
  async findByName(
    name: string,
    categoryId: string,
  ): Promise<{ id: string; name: string; categoryId: string } | null> {
    try {
      return await this.prisma.material.findFirst({
        where: {
          name,
          categoryId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          categoryId: true,
        },
      });
    } catch (error) {
      void this.logger.error('MaterialRepository.findByName falhou', {
        error: String(error),
        name,
        categoryId,
      });

      throw new BadRequestException('Erro ao buscar material');
    }
  }

  async isActivePrintPreset(
    organizationId: string,
    presetId: string,
  ): Promise<boolean> {
    const preset = await this.prisma.printPreset.findFirst({
      where: {
        id: presetId,
        organizationId,
        isActive: true,
        colorProfile: { isActive: true },
      },
      select: { id: true },
    });
    return Boolean(preset);
  }

  async create(
    organizationId: string,
    data: CreateMaterialDTO,
    userId: string,
    options: CreateMaterialOptions = {},
  ): Promise<string> {
    try {
      const createData: Prisma.MaterialUncheckedCreateInput = {
        id: options.id ?? generateId(),
        name: data.name,
        description: data.description ?? null,
        categoryId: data.categoryId,
        requiresAcceptance: data.requiresAcceptance ?? false,
        hasExternalLink: data.hasExternalLink ?? false,
        externalLink: data.externalLink ?? null,
        hasTextCopy: data.hasTextCopy ?? false,
        textCopy: data.textCopy ?? null,
        isCustomizable: data.isCustomizable ?? false,
      };

      const tagsData = options.tags
        ? this.buildCreateTagsData(organizationId, options.tags)
        : undefined;

      if (tagsData) {
        createData.tags = tagsData;
      }

      if (options.files?.length) {
        createData.materialFiles = {
          create: options.files.map((file) => ({
            id: file.id,
            imageKey: file.fileKey,
            originalName: file.originalName,
            mimeType: file.mimeType,
            size: file.size,
            width: file.width,
            height: file.height,
            sortOrder: file.sortOrder,
          })),
        };
      }

      if (data.isCustomizable === true) {
        const baseFileId = options.files?.[0]?.id;
        if (!baseFileId) {
          throw new BadRequestException(
            'Material customizável precisa de uma imagem base',
          );
        }
        createData.materialTemplate = {
          create: {
            id: generateId(),
            organizationId,
            baseMaterialFileId: baseFileId,
            ...resolveTemplateExportConfig({
              exportTypes: data.exportTypes,
              printPresetId: data.printPresetId,
              baseMimeType: options.files?.[0]?.mimeType,
            }),
            status: MaterialTemplateStatus.DRAFT,
          },
        };
      }

      const material = await this.prisma.material.create({
        data: createData,
        select: {
          id: true,
        },
      });

      void this.logger.info('Material criado', {
        materialId: material.id,
        organizationId,
        categoryId: data.categoryId,
        userId,
      });
      return material.id;
    } catch (error) {
      void this.logger.error('MaterialRepository.create falhou', {
        error: String(error),
        organizationId,
        categoryId: data.categoryId,
        userId,
      });

      throw new BadRequestException('Erro ao criar material');
    }
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateMaterialDTO,
    userId: string,
    options: UpdateMaterialOptions = {},
  ): Promise<void> {
    try {
      const material = await this.prisma.material.findFirst({
        where: {
          id,
          deletedAt: null,
          category: {
            organizationId,
            isDeleted: false,
          },
        },
        select: {
          id: true,
          materialTemplate: {
            select: {
              id: true,
              allowedExportTypes: true,
              printPresetId: true,
              digitalExportMimeType: true,
              baseFile: { select: { mimeType: true } },
            },
          },
        },
      });

      if (!material) {
        return;
      }

      const updateData: Prisma.MaterialUncheckedUpdateInput = {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.requiresAcceptance !== undefined && {
          requiresAcceptance: data.requiresAcceptance,
        }),
        ...(data.hasExternalLink !== undefined && {
          hasExternalLink: data.hasExternalLink,
        }),
        ...(data.externalLink !== undefined && {
          externalLink: data.externalLink,
        }),
        ...(data.hasTextCopy !== undefined && {
          hasTextCopy: data.hasTextCopy,
        }),
        ...(data.textCopy !== undefined && {
          textCopy: data.textCopy,
        }),
        ...(data.isCustomizable !== undefined && {
          isCustomizable: data.isCustomizable,
        }),
      };

      if (data.isCustomizable === false && material.materialTemplate) {
        updateData.materialTemplate = {
          delete: true,
        };
      }

      if (options.activateTemplate) {
        const exportConfig = resolveTemplateExportConfig({
          exportTypes: data.exportTypes,
          printPresetId: data.printPresetId,
          baseMimeType: options.activateTemplate.baseMimeType,
        });
        updateData.materialTemplate = {
          upsert: {
            create: {
              id: generateId(),
              organizationId,
              baseMaterialFileId: options.activateTemplate.baseMaterialFileId,
              ...exportConfig,
              status: MaterialTemplateStatus.DRAFT,
            },
            update: {
              baseMaterialFileId: options.activateTemplate.baseMaterialFileId,
              ...exportConfig,
              status: MaterialTemplateStatus.DRAFT,
              publishedAt: null,
              revision: { increment: 1 },
            },
          },
        };
        updateData.materialFiles = {
          update: options.activateTemplate.validatedFiles.map((file) => ({
            where: { id: file.id },
            data: {
              mimeType: file.mimeType,
              width: file.width,
              height: file.height,
            },
          })),
        };
      } else if (
        data.isCustomizable !== false &&
        material.materialTemplate &&
        (data.exportTypes !== undefined || data.printPresetId !== undefined)
      ) {
        const exportConfig = resolveTemplateExportConfig({
          exportTypes:
            data.exportTypes ??
            (material.materialTemplate
              .allowedExportTypes as MaterialExportType[]),
          printPresetId:
            data.printPresetId !== undefined
              ? data.printPresetId
              : material.materialTemplate.printPresetId,
          baseMimeType:
            material.materialTemplate.baseFile?.mimeType ??
            material.materialTemplate.digitalExportMimeType,
        });
        updateData.materialTemplate = {
          update: exportConfig,
        };
      }

      if (options.tags !== undefined) {
        updateData.tags = this.buildUpdateTagsData(
          organizationId,
          options.tags,
        );
      }

      await this.prisma.material.update({
        where: {
          id: material.id,
        },
        data: updateData,
      });

      if (
        material.materialTemplate &&
        (options.activateTemplate ||
          (data.isCustomizable !== false &&
            (data.exportTypes !== undefined ||
              data.printPresetId !== undefined)))
      ) {
        await this.prisma.printPreflight.deleteMany({
          where: { templateId: material.materialTemplate.id },
        });
      }

      void this.logger.info('Material atualizado', {
        materialId: id,
        organizationId,
        userId,
      });
    } catch (error) {
      void this.logger.error('MaterialRepository.update falhou', {
        error: String(error),
        materialId: id,
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao atualizar material');
    }
  }

  private buildCreateTagsData(
    organizationId: string,
    tags: ResolvedMaterialTags,
  ): Prisma.MaterialUncheckedCreateInput['tags'] | undefined {
    if (!tags.existingTagIds.length && !tags.newTagNames.length) {
      return undefined;
    }

    return {
      ...(tags.existingTagIds.length && {
        connect: tags.existingTagIds.map((tagId) => ({ id: tagId })),
      }),
      ...(tags.newTagNames.length && {
        connectOrCreate: tags.newTagNames.map((name) => ({
          where: {
            organizationId_name: {
              organizationId,
              name,
            },
          },
          create: {
            id: generateId(),
            organizationId,
            name,
          },
        })),
      }),
    };
  }

  private buildUpdateTagsData(
    organizationId: string,
    tags: ResolvedMaterialTags,
  ): Prisma.MaterialUncheckedUpdateInput['tags'] {
    return {
      set: [],
      ...(tags.existingTagIds.length && {
        connect: tags.existingTagIds.map((tagId) => ({ id: tagId })),
      }),
      ...(tags.newTagNames.length && {
        connectOrCreate: tags.newTagNames.map((name) => ({
          where: {
            organizationId_name: {
              organizationId,
              name,
            },
          },
          create: {
            id: generateId(),
            organizationId,
            name,
          },
        })),
      }),
    };
  }

  async delete(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.prisma.material.updateMany({
        where: {
          id,
          deletedAt: null,
          category: {
            organizationId,
            isDeleted: false,
          },
        },
        data: {
          deletedAt: new Date(),
        },
      });

      void this.logger.info('Material removido', {
        materialId: id,
        organizationId,
        userId,
      });
    } catch (error) {
      void this.logger.error('MaterialRepository.delete falhou', {
        error: String(error),
        materialId: id,
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao remover material');
    }
  }

  async createFiles(
    materialId: string,
    organizationId: string,
    files: CreateMaterialFileInput[],
    userId: string,
  ): Promise<MaterialFileItem[]> {
    try {
      const createdFiles = await this.prisma.$transaction(async (tx) => {
        const lastFile = await tx.materialFile.findFirst({
          where: { materialId },
          select: { sortOrder: true },
          orderBy: { sortOrder: 'desc' },
        });
        const firstSortOrder = (lastFile?.sortOrder ?? -1) + 1;
        const created: MaterialFileRow[] = [];

        for (const file of files) {
          created.push(
            await tx.materialFile.create({
              data: {
                id: file.id,
                materialId,
                imageKey: file.fileKey,
                originalName: file.originalName,
                mimeType: file.mimeType,
                size: file.size,
                width: file.width,
                height: file.height,
                sortOrder: firstSortOrder + file.sortOrder,
              },
              select: materialFileSelect,
            }),
          );
        }

        return created;
      });

      void this.logger.info('Arquivos de material criados', {
        materialId,
        organizationId,
        filesCount: createdFiles.length,
        userId,
      });

      return createdFiles.map((file) => this.mapMaterialFile(file));
    } catch (error) {
      void this.logger.error('MaterialRepository.createFiles falhou', {
        error: String(error),
        materialId,
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao salvar arquivos do material');
    }
  }

  async findCustomizableUploadContext(
    materialId: string,
    organizationId: string,
  ): Promise<CustomizableUploadContext | null> {
    try {
      const template = await this.prisma.materialTemplate.findFirst({
        where: {
          materialId,
          organizationId,
          material: {
            deletedAt: null,
            isCustomizable: true,
            category: { organizationId, isDeleted: false },
          },
        },
        select: {
          id: true,
          revision: true,
          document: true,
          material: {
            select: {
              materialFiles: {
                select: {
                  id: true,
                  width: true,
                  height: true,
                  sortOrder: true,
                },
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
              },
            },
          },
        },
      });
      if (!template) return null;
      const activePrintExportCount = await this.prisma.printExport.count({
        where: {
          materialId,
          organizationId,
          status: {
            in: [PrintExportStatus.QUEUED, PrintExportStatus.PROCESSING],
          },
        },
      });
      return {
        templateId: template.id,
        revision: template.revision,
        document: template.document,
        files: template.material.materialFiles,
        activePrintExportCount,
      };
    } catch (error) {
      void this.logger.error(
        'MaterialRepository.findCustomizableUploadContext falhou',
        {
          error: String(error),
          materialId,
          organizationId,
        },
      );
      throw new BadRequestException('Erro ao buscar template do material');
    }
  }

  async addCustomizableFiles(
    materialId: string,
    organizationId: string,
    files: CreateMaterialFileInput[],
    options: AddCustomizableFilesOptions,
    userId: string,
  ): Promise<MaterialFileItem[]> {
    try {
      const createdFiles = await this.prisma.$transaction(async (tx) => {
        const activePrintExportCount = await tx.printExport.count({
          where: {
            materialId,
            organizationId,
            status: {
              in: [PrintExportStatus.QUEUED, PrintExportStatus.PROCESSING],
            },
          },
        });
        if (activePrintExportCount > 0) {
          throw new BadRequestException(
            CUSTOMIZABLE_PRINT_EXPORT_IN_PROGRESS_MESSAGE,
          );
        }

        const currentFiles = await tx.materialFile.findMany({
          where: { materialId },
          select: { id: true, sortOrder: true },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        });
        const currentIds = currentFiles.map((file) => file.id);
        if (
          currentIds.length !== options.existingFileIds.length ||
          currentIds.some((id, index) => id !== options.existingFileIds[index])
        ) {
          throw new ConflictException(
            'O template foi alterado em outra sessão. Recarregue para continuar.',
          );
        }
        if (
          currentFiles.length + files.length >
          MAX_CUSTOMIZABLE_MATERIAL_IMAGES
        ) {
          throw new BadRequestException(CUSTOMIZABLE_IMAGE_COUNT_MESSAGE);
        }

        const firstSortOrder =
          currentFiles.reduce(
            (max, file) => Math.max(max, file.sortOrder),
            -1,
          ) + 1;
        const created: MaterialFileRow[] = [];
        for (const file of files) {
          created.push(
            await tx.materialFile.create({
              data: {
                id: file.id,
                materialId,
                imageKey: file.fileKey,
                originalName: file.originalName,
                mimeType: file.mimeType,
                size: file.size,
                width: file.width,
                height: file.height,
                sortOrder: firstSortOrder + file.sortOrder,
              },
              select: materialFileSelect,
            }),
          );
        }

        const updated = await tx.materialTemplate.updateMany({
          where: {
            id: options.templateId,
            materialId,
            organizationId,
            revision: options.revision,
            material: {
              deletedAt: null,
              isCustomizable: true,
              category: { organizationId, isDeleted: false },
            },
          },
          data: {
            document: options.document as Prisma.InputJsonValue,
            schemaVersion: 3,
            status: MaterialTemplateStatus.DRAFT,
            publishedAt: null,
            revision: { increment: 1 },
          },
        });
        if (updated.count !== 1) {
          throw new ConflictException(
            'O template foi alterado em outra sessão. Recarregue para continuar.',
          );
        }
        await tx.printPreflight.deleteMany({
          where: { templateId: options.templateId },
        });
        return created;
      });

      void this.logger.info('Imagens incluídas no material customizável', {
        materialId,
        organizationId,
        filesCount: createdFiles.length,
        userId,
      });
      return createdFiles.map((file) => this.mapMaterialFile(file));
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      void this.logger.error('MaterialRepository.addCustomizableFiles falhou', {
        error: String(error),
        materialId,
        organizationId,
        userId,
      });
      throw new BadRequestException('Erro ao salvar arquivos do material');
    }
  }

  async deleteCustomizableFile(
    materialId: string,
    fileId: string,
    organizationId: string,
    options: DeleteCustomizableFileOptions,
    userId: string,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const activePrintExportCount = await tx.printExport.count({
          where: {
            materialId,
            organizationId,
            status: {
              in: [PrintExportStatus.QUEUED, PrintExportStatus.PROCESSING],
            },
          },
        });
        if (activePrintExportCount > 0) {
          throw new BadRequestException(
            CUSTOMIZABLE_DELETE_PRINT_EXPORT_MESSAGE,
          );
        }

        const currentFiles = await tx.materialFile.findMany({
          where: { materialId },
          select: { id: true, sortOrder: true },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        });
        const currentIds = currentFiles.map((file) => file.id);
        if (
          currentIds.length !== options.existingFileIds.length ||
          currentIds.some((id, index) => id !== options.existingFileIds[index])
        ) {
          throw new ConflictException(
            'O template foi alterado em outra sessão. Recarregue para continuar.',
          );
        }
        if (currentFiles.length <= 1) {
          throw new BadRequestException(CUSTOMIZABLE_LAST_IMAGE_MESSAGE);
        }
        const remaining = currentFiles.filter((file) => file.id !== fileId);
        if (remaining.length === currentFiles.length) {
          throw new NotFoundException('Arquivo do material não encontrado');
        }
        const nextAnchor = remaining.reduce((best, file) =>
          file.sortOrder < best.sortOrder ||
          (file.sortOrder === best.sortOrder && file.id < best.id)
            ? file
            : best,
        );
        const template = await tx.materialTemplate.findFirst({
          where: {
            id: options.templateId,
            materialId,
            organizationId,
          },
          select: { baseMaterialFileId: true },
        });
        if (!template) {
          throw new NotFoundException('Template não encontrado');
        }

        const updated = await tx.materialTemplate.updateMany({
          where: {
            id: options.templateId,
            materialId,
            organizationId,
            revision: options.revision,
            material: {
              deletedAt: null,
              isCustomizable: true,
              category: { organizationId, isDeleted: false },
            },
          },
          data: {
            document: options.document as Prisma.InputJsonValue,
            schemaVersion: 3,
            status: MaterialTemplateStatus.DRAFT,
            publishedAt: null,
            revision: { increment: 1 },
            ...(template.baseMaterialFileId === fileId && {
              baseMaterialFileId: nextAnchor.id,
            }),
          },
        });
        if (updated.count !== 1) {
          throw new ConflictException(
            'O template foi alterado em outra sessão. Recarregue para continuar.',
          );
        }

        await tx.materialTemplateAsset.deleteMany({
          where: { templateId: options.templateId },
        });
        if (options.assetIds.length) {
          await tx.materialTemplateAsset.createMany({
            data: options.assetIds.map((assetId) => ({
              templateId: options.templateId,
              assetId,
            })),
            skipDuplicates: true,
          });
        }
        await tx.printPreflight.deleteMany({
          where: { templateId: options.templateId },
        });

        const deleted = await tx.materialFile.deleteMany({
          where: {
            id: fileId,
            materialId,
            material: {
              deletedAt: null,
              category: { organizationId, isDeleted: false },
            },
          },
        });
        if (deleted.count !== 1) {
          throw new NotFoundException('Arquivo do material não encontrado');
        }
      });

      void this.logger.info('Imagem de material customizável removida', {
        materialId,
        fileId,
        organizationId,
        userId,
      });
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      void this.logger.error(
        'MaterialRepository.deleteCustomizableFile falhou',
        {
          error: String(error),
          materialId,
          fileId,
          organizationId,
          userId,
        },
      );
      throw new BadRequestException('Erro ao remover arquivo do material');
    }
  }

  async findFilesByMaterialId(
    materialId: string,
    organizationId: string,
  ): Promise<MaterialFileItem[]> {
    try {
      const files = await this.prisma.materialFile.findMany({
        where: {
          materialId,
          material: {
            deletedAt: null,
            category: {
              organizationId,
              isDeleted: false,
            },
          },
        },
        select: materialFileSelect,
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      });

      return files.map((file) => this.mapMaterialFile(file));
    } catch (error) {
      void this.logger.error(
        'MaterialRepository.findFilesByMaterialId falhou',
        {
          error: String(error),
          materialId,
          organizationId,
        },
      );

      throw new BadRequestException('Erro ao buscar arquivos do material');
    }
  }

  async findFileById(
    id: string,
    materialId: string,
    organizationId: string,
  ): Promise<MaterialFileItem | null> {
    try {
      const file = await this.prisma.materialFile.findFirst({
        where: {
          id,
          materialId,
          material: {
            deletedAt: null,
            category: {
              organizationId,
              isDeleted: false,
            },
          },
        },
        select: materialFileSelect,
      });

      return file ? this.mapMaterialFile(file) : null;
    } catch (error) {
      void this.logger.error('MaterialRepository.findFileById falhou', {
        error: String(error),
        id,
        materialId,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar arquivo do material');
    }
  }

  async deleteFile(
    id: string,
    materialId: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.materialTemplate.deleteMany({
          where: {
            materialId,
            organizationId,
            baseMaterialFileId: id,
            material: {
              isCustomizable: false,
              deletedAt: null,
              category: {
                organizationId,
                isDeleted: false,
              },
            },
          },
        });

        await tx.materialFile.deleteMany({
          where: {
            id,
            materialId,
            material: {
              deletedAt: null,
              category: {
                organizationId,
                isDeleted: false,
              },
            },
          },
        });
      });

      void this.logger.info('Arquivo de material removido', {
        fileId: id,
        materialId,
        organizationId,
        userId,
      });
    } catch (error) {
      void this.logger.error('MaterialRepository.deleteFile falhou', {
        error: String(error),
        id,
        materialId,
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao remover arquivo do material');
    }
  }

  private mapMaterialFile(file: MaterialFileRow): MaterialFileItem {
    return {
      id: file.id,
      materialId: file.materialId,
      fileKey: file.imageKey,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      width: file.width,
      height: file.height,
      sortOrder: file.sortOrder,
    };
  }

  async upsertAcceptance(
    materialId: string,
    userId: string,
    acceptedAt: Date,
  ): Promise<void> {
    try {
      await this.prisma.materialAcceptance.upsert({
        where: {
          materialId_userId: {
            materialId,
            userId,
          },
        },
        create: {
          id: generateId(),
          materialId,
          userId,
          accepted: true,
          acceptedAt,
        },
        update: {
          accepted: true,
          acceptedAt,
        },
      });
    } catch (error) {
      void this.logger.error('MaterialRepository.upsertAcceptance falhou', {
        error: String(error),
        materialId,
        userId,
      });

      throw new BadRequestException('Erro ao registrar aceite do material');
    }
  }

  async registerView(
    materialId: string,
    viewedAt: Date = new Date(),
  ): Promise<void> {
    try {
      await this.prisma.materialView.create({
        data: {
          id: generateId(),
          materialId,
          viewedAt,
        },
      });
    } catch (error) {
      void this.logger.error('MaterialRepository.registerView falhou', {
        error: String(error),
        materialId,
      });

      throw new BadRequestException(
        'Erro ao registrar visualização do material',
      );
    }
  }

  async registerDownload(
    materialId: string,
    userId: string,
    downloadedAt: Date = new Date(),
  ): Promise<void> {
    try {
      await this.prisma.materialDownload.create({
        data: {
          id: generateId(),
          materialId,
          userId,
          downloadedAt,
        },
      });
    } catch (error) {
      void this.logger.error('MaterialRepository.registerDownload falhou', {
        error: String(error),
        materialId,
        userId,
      });

      throw new BadRequestException('Erro ao registrar download do material');
    }
  }

  async findRoleIdsByCategoryAndOrganization(
    categoryId: string,
    organizationId: string,
    roleId?: string,
  ): Promise<string[]> {
    const where: Prisma.CategoryRoleAccessWhereInput = {
      categoryId,
      organizationId,
      ...(roleId && { roleId }),
    };

    const rows = await this.prisma.categoryRoleAccess.findMany({
      where,
      select: { roleId: true },
    });

    return rows.map((row) => row.roleId);
  }

  async findEligibleMembersForCategory(
    organizationId: string,
    categoryId: string,
  ): Promise<Array<{ userId: string; name: string; email: string }>> {
    try {
      const roleIds = await this.findRoleIdsByCategoryAndOrganization(
        categoryId,
        organizationId,
      );

      const members = await this.prisma.member.findMany({
        where: {
          organizationId,
          user: {
            isActive: true,
            isDeleted: false,
          },
          ...(roleIds.length > 0 && {
            roleId: { in: roleIds },
          }),
        },
        select: {
          userId: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ user: { name: 'asc' } }],
      });

      return members.map((member) => ({
        userId: member.userId,
        name: member.user.name,
        email: member.user.email,
      }));
    } catch (error) {
      void this.logger.error(
        'MaterialRepository.findEligibleMembersForCategory falhou',
        {
          error: String(error),
          organizationId,
          categoryId,
        },
      );

      throw new BadRequestException(
        'Erro ao buscar membros elegíveis para o material',
      );
    }
  }

  async findPlatformMembersForCategory(
    organizationId: string,
    categoryId: string,
    roleId?: string,
  ): Promise<Array<{ userId: string; name: string; email: string }>> {
    try {
      const accessRoleIds = await this.findRoleIdsByCategoryAndOrganization(
        categoryId,
        organizationId,
      );

      if (
        roleId &&
        accessRoleIds.length > 0 &&
        !accessRoleIds.includes(roleId)
      ) {
        return [];
      }

      const members = await this.prisma.member.findMany({
        where: {
          organizationId,
          role: { canAccessBackoffice: false },
          user: {
            isActive: true,
            isDeleted: false,
            OR: [
              { globalRoleId: null },
              { globalRole: { canAccessBackoffice: false } },
            ],
          },
          ...(roleId
            ? { roleId }
            : accessRoleIds.length > 0
              ? { roleId: { in: accessRoleIds } }
              : {}),
        },
        select: {
          userId: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ user: { name: 'asc' } }],
      });

      return members.map((member) => ({
        userId: member.userId,
        name: member.user.name,
        email: member.user.email,
      }));
    } catch (error) {
      void this.logger.error(
        'MaterialRepository.findPlatformMembersForCategory falhou',
        {
          error: String(error),
          organizationId,
          categoryId,
        },
      );

      throw new BadRequestException(
        'Erro ao buscar membros da plataforma para notificação do material',
      );
    }
  }

  async userHasCategoryAccess(
    organizationId: string,
    categoryId: string,
    userId: string,
  ): Promise<boolean> {
    const canViewAllCategories = await this.isGlobalAdmin(userId);

    if (canViewAllCategories) {
      return true;
    }

    const member = await this.findActiveMember(organizationId, userId);

    if (!member) {
      return false;
    }

    const roleIds = await this.findRoleIdsByCategoryAndOrganization(
      categoryId,
      organizationId,
    );

    if (roleIds.length === 0) {
      return true;
    }

    return roleIds.includes(member.roleId);
  }

  async findAcceptanceReportRows(
    materialId: string,
    organizationId: string,
  ): Promise<MaterialAcceptanceReportRow[]> {
    try {
      const material = await this.prisma.material.findFirst({
        where: {
          id: materialId,
          deletedAt: null,
          category: {
            organizationId,
            isDeleted: false,
          },
        },
        select: {
          categoryId: true,
        },
      });

      if (!material) {
        return [];
      }

      const eligibleMembers = await this.findEligibleMembersForCategory(
        organizationId,
        material.categoryId,
      );

      const acceptances = await this.prisma.materialAcceptance.findMany({
        where: { materialId },
        select: {
          userId: true,
          acceptedAt: true,
        },
      });

      const acceptanceByUserId = new Map(
        acceptances.map((acceptance) => [
          acceptance.userId,
          acceptance.acceptedAt,
        ]),
      );

      return eligibleMembers.map((member) => {
        const acceptedAt = acceptanceByUserId.get(member.userId) ?? null;

        return {
          name: member.name,
          email: member.email,
          viewed: acceptedAt !== null,
          acceptedAt,
        };
      });
    } catch (error) {
      void this.logger.error(
        'MaterialRepository.findAcceptanceReportRows falhou',
        {
          error: String(error),
          materialId,
          organizationId,
        },
      );

      throw new BadRequestException(
        'Erro ao gerar relatório de aceite do material',
      );
    }
  }

  async createMaterialEmailDispatch(data: {
    organizationId: string;
    materialId: string;
    materialName: string;
    subject: string;
    content: string;
    recipients: Array<{ userId: string; name: string; email: string }>;
  }): Promise<void> {
    try {
      await this.prisma.materialEmailDispatch.create({
        data: {
          id: generateId(),
          organizationId: data.organizationId,
          materialId: data.materialId,
          materialName: data.materialName,
          subject: data.subject,
          content: data.content,
          recipients: {
            create: data.recipients.map((recipient) => ({
              id: generateId(),
              userId: recipient.userId,
              name: recipient.name,
              email: recipient.email,
            })),
          },
        },
      });
    } catch (error) {
      void this.logger.error(
        'MaterialRepository.createMaterialEmailDispatch falhou',
        {
          error: String(error),
          organizationId: data.organizationId,
          materialId: data.materialId,
        },
      );

      throw new BadRequestException(
        'Erro ao registrar disparo de e-mail do material',
      );
    }
  }

  async findMaterialSummaryById(
    materialId: string,
    organizationId: string,
  ): Promise<{ id: string; name: string; categoryId: string } | null> {
    return await this.prisma.material.findFirst({
      where: {
        id: materialId,
        deletedAt: null,
        category: {
          organizationId,
          isDeleted: false,
        },
      },
      select: {
        id: true,
        name: true,
        categoryId: true,
      },
    });
  }
}
