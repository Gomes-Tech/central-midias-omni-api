import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

const materialListSelect = {
  id: true,
  name: true,
  description: true,
  categoryId: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  _count: {
    select: {
      materialFiles: true,
    },
  },
} satisfies Prisma.MaterialSelect;

const materialDetailsSelect = {
  ...materialListSelect,
  deletedAt: true,
} satisfies Prisma.MaterialSelect;

type MaterialListRow = Prisma.MaterialGetPayload<{
  select: typeof materialListSelect;
}>;

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
}

@Injectable()
export class MaterialRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(
    organizationId: string,
    filters: FindAllMaterialsFiltersDTO = {},
  ): Promise<MaterialListItem[]> {
    try {
      const where: Prisma.MaterialWhereInput = {
        deletedAt: null,
        category: {
          organizationId,
          isDeleted: false,
        },
        ...(filters.categoryId && { categoryId: filters.categoryId }),
        ...(filters.searchTerm && {
          OR: [
            {
              name: {
                contains: filters.searchTerm,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: filters.searchTerm,
                mode: 'insensitive',
              },
            },
          ],
        }),
      };

      const materials = await this.prisma.material.findMany({
        where,
        select: materialListSelect,
        orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
      });

      return materials.map((material) => this.mapListItem(material));
    } catch (error) {
      void this.logger.error('MaterialRepository.findAll falhou', {
        error: String(error),
        organizationId,
        filters,
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
        select: materialDetailsSelect,
      });

      return material
        ? ({
            ...this.mapListItem(material),
            deletedAt: material.deletedAt,
          } as MaterialDetails)
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
      const material = await this.prisma.material.create({
        data: {
          ...(options.id && { id: options.id }),
          name: data.name,
          description: data.description ?? null,
          categoryId: data.categoryId,
          ...(options.files?.length && {
            materialFiles: {
              create: options.files.map((file) => ({
                imageKey: file.fileKey,
                mimeType: file.mimeType,
                size: file.size,
              })),
            },
          }),
        },
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
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        },
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

  // Por conta do tipo composto retornado pela query, faz sentido manter o mapeamento manual para os tipos de retorno do repositório
  private mapListItem(material: MaterialListRow): MaterialListItem {
    return {
      id: material.id,
      name: material.name,
      description: material.description,
      categoryId: material.categoryId,
      createdAt: material.createdAt,
      updatedAt: material.updatedAt,
      category: material.category,
      materialFilesCount: material._count.materialFiles,
    };
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
