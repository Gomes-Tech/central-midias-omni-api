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
  UpdateMaterialDTO,
} from '../dto';
import {
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
        select: buildMaterialDetailsSelect(organizationId),
      });

      return material
        ? {
            id: material.id,
            name: material.name,
            description: material.description,
            categoryId: material.categoryId,
            createdAt: material.createdAt,
            updatedAt: material.updatedAt,
            category: material.category,
            tags: material.tags.map((tag) => tag.id),
            materialFilesCount: material.materialFiles.length,
            deletedAt: material.deletedAt,
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

      const updateData: Prisma.MaterialUncheckedUpdateInput = {};

      if (data.name !== undefined) {
        updateData.name = data.name;
      }

      if (data.description !== undefined) {
        updateData.description = data.description;
      }

      if (data.categoryId !== undefined) {
        updateData.categoryId = data.categoryId;
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
}
