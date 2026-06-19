import { BadRequestException } from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResponse } from '../../../types';
import {
  CreateMaterialDTO,
  FindAllMaterialsFiltersDTO,
  SearchMaterialsFiltersDTO,
  UpdateMaterialDTO,
} from '../dto';
import {
  MaterialAcceptanceReportRow,
  MaterialDetails,
  MaterialFileItem,
  MaterialListItem,
} from '../entities';
import type { ResolvedMaterialTags } from '../use-cases/resolve-material-tags.use-case';

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
      },
    },
  }) satisfies Prisma.MaterialSelect;

const materialFileSelect = {
  id: true,
  materialId: true,
  imageKey: true,
  mimeType: true,
  size: true,
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

export interface CreateMaterialFileInput {
  fileKey: string;
  mimeType: string;
  size: number;
}

export interface CreateMaterialOptions {
  id?: string;
  files?: CreateMaterialFileInput[];
  tags?: ResolvedMaterialTags;
}

export interface UpdateMaterialOptions {
  tags?: ResolvedMaterialTags;
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
    const { page = 1, limit = 25, categoryId, searchTerm } = filters;
    const skip = (page - 1) * limit;

    try {
      const where: Prisma.MaterialWhereInput = {
        deletedAt: null,
        category: {
          organizationId,
          isDeleted: false,
        },
        ...(categoryId && { categoryId }),
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

  async search(
    organizationId: string,
    userId: string,
    filters: SearchMaterialsFiltersDTO = {},
  ): Promise<PaginatedResponse<MaterialListItem & { materialFile: string }>> {
    const { page = 1, limit = 25, term } = filters;

    if (!term?.trim()) {
      return { data: [], total: 0, page, totalPages: 0 };
    }

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
              contains: term,
              mode: 'insensitive',
            },
          },
          {
            tags: {
              some: {
                organizationId,
                name: {
                  contains: term,
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
            category: {
              select: {
                name: true,
              },
            },
            materialFiles: {
              select: {
                id: true,
                imageKey: true,
              },
              take: 1,
            },
          },
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
          materialFile: material.materialFiles[0]?.imageKey,
        })),
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

      return await this.prisma.material.findMany({
        where: {
          deletedAt: null,
          category: categoryWhere,
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
          materialFiles: {
            some: {
              mimeType: {
                startsWith: 'image/',
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: materialMostAccessedSelect,
      });

      const seenCategories = new Set<string>();
      const selected: MaterialMostAccessedRow[] = [];

      for (const material of materials) {
        if (seenCategories.has(material.categoryId)) {
          continue;
        }

        const hasImageFile = material.materialFiles.some((file) =>
          file.mimeType.startsWith('image/'),
        );

        if (!hasImageFile) {
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
            hasExternalLink: material.hasExternalLink,
            externalLink: material.externalLink,
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

  async create(
    organizationId: string,
    data: CreateMaterialDTO,
    userId: string,
    options: CreateMaterialOptions = {},
  ): Promise<void> {
    try {
      const createData: Prisma.MaterialUncheckedCreateInput = {
        id: options.id ?? generateId(),
        name: data.name,
        description: data.description ?? null,
        categoryId: data.categoryId,
        requiresAcceptance: data.requiresAcceptance ?? false,
        hasExternalLink: data.hasExternalLink ?? false,
        externalLink: data.externalLink ?? null,
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
            id: generateId(),
            imageKey: file.fileKey,
            mimeType: file.mimeType,
            size: file.size,
          })),
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
      };

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
      const createdFiles = await Promise.all(
        files.map((file) =>
          this.prisma.materialFile.create({
            data: {
              id: generateId(),
              materialId,
              imageKey: file.fileKey,
              mimeType: file.mimeType,
              size: file.size,
            },
            select: materialFileSelect,
          }),
        ),
      );

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
        orderBy: {
          id: 'asc',
        },
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
      await this.prisma.materialFile.deleteMany({
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
      mimeType: file.mimeType,
      size: file.size,
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
  ): Promise<string[]> {
    const rows = await this.prisma.categoryRoleAccess.findMany({
      where: { categoryId, organizationId },
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
  ): Promise<Array<{ userId: string; name: string; email: string }>> {
    try {
      const roleIds = await this.findRoleIdsByCategoryAndOrganization(
        categoryId,
        organizationId,
      );

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
