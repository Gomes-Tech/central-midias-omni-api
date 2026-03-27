import { BadRequestException } from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CreateCategoryDTO,
  FindAllCategoriesFiltersDTO,
  UpdateCategoryDTO,
} from '../dto';
import {
  CategoryDetails,
  CategoryListItem,
  CategoryTreeItem,
} from '../entities';

@Injectable()
export class CategoryRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(
    organizationId: string,
    filters: FindAllCategoriesFiltersDTO = {},
  ): Promise<CategoryListItem[]> {
    try {
      const where: Prisma.CategoryWhereInput = {
        organizationId,
        isDeleted: false,
        ...(filters.parentId !== undefined && { parentId: filters.parentId }),
        ...(typeof filters.isActive === 'boolean' && {
          isActive: filters.isActive,
        }),
        ...(filters.searchTerm && {
          OR: [
            {
              name: {
                contains: filters.searchTerm,
                mode: 'insensitive',
              },
            },
            {
              slug: {
                contains: filters.searchTerm,
                mode: 'insensitive',
              },
            },
          ],
        }),
      };

      return await this.prisma.category.findMany({
        where,
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          order: true,
          parentId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      void this.logger.error('CategoryRepository.findAll falhou', {
        error: String(error),
        organizationId,
        filters,
      });

      throw new BadRequestException('Erro ao buscar categorias');
    }
  }

  async findTree(organizationId: string): Promise<CategoryTreeItem[]> {
    try {
      const categories = await this.prisma.category.findMany({
        where: {
          organizationId,
          isDeleted: false,
        },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          order: true,
          parentId: true,
        },
      });

      const map = new Map<string, CategoryTreeItem>();
      const tree: CategoryTreeItem[] = [];

      for (const category of categories) {
        map.set(category.id, {
          ...category,
          children: [],
        });
      }

      for (const category of categories) {
        const node = map.get(category.id);

        if (!node) {
          continue;
        }

        if (category.parentId && map.has(category.parentId)) {
          map.get(category.parentId)?.children.push(node);
          continue;
        }

        tree.push(node);
      }

      return tree;
    } catch (error) {
      void this.logger.error('CategoryRepository.findTree falhou', {
        error: String(error),
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar árvore de categorias');
    }
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<CategoryDetails | null> {
    try {
      return await this.prisma.category.findFirst({
        where: {
          id,
          organizationId,
          isDeleted: false,
        },
        select: {
          id: true,
          organizationId: true,
          name: true,
          slug: true,
          isActive: true,
          order: true,
          parentId: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          children: {
            where: {
              isDeleted: false,
            },
            orderBy: [{ order: 'asc' }, { name: 'asc' }],
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
              order: true,
            },
          },
        },
      });
    } catch (error) {
      void this.logger.error('CategoryRepository.findById falhou', {
        error: String(error),
        id,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar categoria');
    }
  }

  async findBySlug(
    slug: string,
    organizationId: string,
  ): Promise<{ id: string; slug: string } | null> {
    try {
      return await this.prisma.category.findUnique({
        where: {
          isDeleted: false,
          organizationId_slug: {
            organizationId,
            slug,
          },
        },
        select: {
          id: true,
          slug: true,
        },
      });
    } catch (error) {
      void this.logger.error('CategoryRepository.findBySlug falhou', {
        error: String(error),
        slug,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar categoria por slug');
    }
  }

  async findByOrder(
    order: number,
    organizationId: string,
  ): Promise<{ id: string; order: number } | null> {
    try {
      return await this.prisma.category.findUnique({
        where: {
          isDeleted: false,
          organizationId_order: {
            organizationId,
            order,
          },
        },
        select: {
          id: true,
          order: true,
        },
      });
    } catch (error) {
      void this.logger.error('CategoryRepository.findByOrder falhou', {
        error: String(error),
        order,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar categoria por ordem');
    }
  }

  async findHierarchyReferences(
    organizationId: string,
  ): Promise<Array<{ id: string; parentId: string | null }>> {
    try {
      return await this.prisma.category.findMany({
        where: {
          organizationId,
          isDeleted: false,
        },
        select: {
          id: true,
          parentId: true,
        },
      });
    } catch (error) {
      void this.logger.error(
        'CategoryRepository.findHierarchyReferences falhou',
        {
          error: String(error),
          organizationId,
        },
      );

      throw new BadRequestException('Erro ao buscar hierarquia de categorias');
    }
  }

  async countChildren(id: string, organizationId: string): Promise<number> {
    try {
      return await this.prisma.category.count({
        where: {
          organizationId,
          parentId: id,
          isDeleted: false,
        },
      });
    } catch (error) {
      void this.logger.error('CategoryRepository.countChildren falhou', {
        error: String(error),
        id,
        organizationId,
      });

      throw new BadRequestException('Erro ao contar subcategorias');
    }
  }

  async create(
    organizationId: string,
    data: CreateCategoryDTO,
    userId: string,
  ): Promise<void> {
    try {
      await this.prisma.category.create({
        data: {
          id: generateId(),
          organizationId,
          name: data.name,
          slug: data.slug,
          order: data.order,
          isActive: data.isActive ?? true,
          ...(data.parentId && { parentId: data.parentId }),
        },
      });

      void this.logger.info('Categoria criada', {
        organizationId,
        userId,
        slug: data.slug,
      });
    } catch (error) {
      void this.logger.error('CategoryRepository.create falhou', {
        error: String(error),
        organizationId,
        userId,
        slug: data.slug,
      });

      throw new BadRequestException('Erro ao criar categoria');
    }
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateCategoryDTO,
    userId: string,
  ): Promise<void> {
    try {
      await this.prisma.category.update({
        where: {
          id,
          organizationId,
          isDeleted: false,
        },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.slug !== undefined && { slug: data.slug }),
          ...(data.order !== undefined && { order: data.order }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.parentId !== undefined && { parentId: data.parentId }),
        },
      });

      void this.logger.info('Categoria atualizada', {
        categoryId: id,
        organizationId,
        userId,
      });
    } catch (error) {
      void this.logger.error('CategoryRepository.update falhou', {
        error: String(error),
        categoryId: id,
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao atualizar categoria');
    }
  }

  async delete(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    try {
      const hierarchy = await this.findHierarchyReferences(organizationId);
      const idsToDelete = new Set<string>([id]);
      const queue = [id];

      while (queue.length > 0) {
        const currentId = queue.shift();

        if (!currentId) {
          continue;
        }

        for (const category of hierarchy) {
          if (category.parentId !== currentId || idsToDelete.has(category.id)) {
            continue;
          }

          idsToDelete.add(category.id);
          queue.push(category.id);
        }
      }

      await this.prisma.category.updateMany({
        where: {
          id: {
            in: Array.from(idsToDelete),
          },
          organizationId,
          isDeleted: false,
        },
        data: {
          isActive: false,
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      void this.logger.info('Categoria removida', {
        categoryId: id,
        organizationId,
        userId,
        deletedCount: idsToDelete.size,
      });
    } catch (error) {
      void this.logger.error('CategoryRepository.delete falhou', {
        error: String(error),
        categoryId: id,
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao remover categoria');
    }
  }
}
