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
          slugPath: true,
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

  async findTree(
    organizationId: string,
    userId: string,
    filters: FindAllCategoriesFiltersDTO = {},
  ): Promise<CategoryTreeItem[]> {
    try {
      const member = await this.prisma.member.findFirst({
        where: {
          organizationId,
          userId,
          user: { isActive: true, isDeleted: false },
        },
        select: { roleId: true },
      });

      const canViewAllCategories = await this.isGlobalAdmin(userId);

      if (!member && !canViewAllCategories) {
        return [];
      }

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

      const categories = await this.prisma.category.findMany({
        where,
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          slugPath: true,
          isActive: true,
          order: true,
          parentId: true,
          categoryRoleAccesses: {
            select: { roleId: true },
          },
        },
      });

      const categoriesById = new Map(
        categories.map((category) => [category.id, category]),
      );
      const includedIds = new Set<string>();

      const isCategoryAccessible = (category: (typeof categories)[number]) => {
        if (canViewAllCategories) {
          return true;
        }

        if (category.categoryRoleAccesses.length === 0) {
          return true;
        }

        return category.categoryRoleAccesses.some(
          (access) => access.roleId === member.roleId,
        );
      };

      const includeWithAncestors = (categoryId: string) => {
        let currentId: string | null | undefined = categoryId;

        while (currentId) {
          if (includedIds.has(currentId)) {
            break;
          }

          const current = categoriesById.get(currentId);

          if (!current) {
            break;
          }

          includedIds.add(current.id);
          currentId = current.parentId;
        }
      };

      for (const category of categories) {
        if (isCategoryAccessible(category)) {
          includeWithAncestors(category.id);
        }
      }

      const visibleCategories = categories.filter((category) =>
        includedIds.has(category.id),
      );

      const map = new Map<string, CategoryTreeItem>();
      const tree: CategoryTreeItem[] = [];

      for (const category of visibleCategories) {
        map.set(category.id, {
          id: category.id,
          name: category.name,
          slug: category.slug,
          slugPath: category.slugPath,
          isActive: category.isActive,
          order: category.order,
          parentId: category.parentId,
          children: [],
        });
      }

      for (const category of visibleCategories) {
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
        filters,
      });

      throw new BadRequestException('Erro ao buscar árvore de categorias');
    }
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
          slugPath: true,
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
              slugPath: true,
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
              slugPath: true,
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

  async findBySlugPath(
    slugPath: string,
    organizationId: string,
  ): Promise<{
    id: string;
    slug: string;
    name: string;
    slugPath: string;
  } | null> {
    try {
      return await this.prisma.category.findFirst({
        where: {
          organizationId,
          slugPath,
          isDeleted: false,
        },
        select: {
          id: true,
          slug: true,
          name: true,
          slugPath: true,
        },
      });
    } catch (error) {
      void this.logger.error('CategoryRepository.findBySlugPath falhou', {
        error: String(error),
        slugPath,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar categoria');
    }
  }

  async findSiblingBySlug(
    slug: string,
    organizationId: string,
    parentId: string | null,
    excludeId?: string,
  ): Promise<{ id: string; slug: string } | null> {
    try {
      return await this.prisma.category.findFirst({
        where: {
          organizationId,
          slug,
          parentId,
          isDeleted: false,
          ...(excludeId && { id: { not: excludeId } }),
        },
        select: {
          id: true,
          slug: true,
        },
      });
    } catch (error) {
      void this.logger.error('CategoryRepository.findSiblingBySlug falhou', {
        error: String(error),
        slug,
        organizationId,
        parentId,
      });

      throw new BadRequestException('Erro ao buscar categoria por slug');
    }
  }

  async findTreeBySlugPath(
    slugPath: string,
    organizationId: string,
    userId: string,
  ) {
    const result = await this.prisma.$queryRawUnsafe<
      { type: string; data: any[] | null }[]
    >(
      `
      WITH RECURSIVE

      -- 🔒 Categorias acessíveis pelo usuário
      accessible_categories AS (
        SELECT c.*
        FROM "categories" c
        WHERE
          c."organization_id" = $1
          AND c."is_deleted" = false
          AND c."is_active" = true
          AND EXISTS (
            SELECT 1
            FROM "category_role_accesses" cra
            JOIN "roles" r ON r.id = cra."role_id"
            JOIN "members" m ON m."role_id" = r.id
            WHERE
              cra."category_id" = c.id
              AND m."user_id" = $2
              AND m."organization_id" = $1
          )
      ),

      -- 🎯 Categoria inicial
      start_node AS (
        SELECT *
        FROM accessible_categories
        WHERE slug_path = $3
        LIMIT 1
      ),

      -- 🔼 SUBINDO (pais)
      up_tree AS (
        SELECT * FROM start_node
        UNION ALL
        SELECT parent.*
        FROM accessible_categories parent
        JOIN up_tree ut ON ut."parentId" = parent.id
      ),

      -- 🔽 DESCENDO (filhos)
      down_tree AS (
        SELECT * FROM start_node
        UNION ALL
        SELECT child.*
        FROM accessible_categories child
        JOIN down_tree dt ON child."parentId" = dt.id
      )

      SELECT
        'path' as type,
        json_agg(
          json_build_object(
            'id', ut.id,
            'name', ut.name,
            'slug', ut.slug,
            'slugPath', ut.slug_path
          )
        ) as data
      FROM up_tree ut

      UNION ALL

      SELECT
        'tree' as type,
        json_agg(
          json_build_object(
            'id', dt.id,
            'name', dt.name,
            'slug', dt.slug,
            'slugPath', dt.slug_path,
            'parentId', dt."parentId"
          )
        ) as data
      FROM down_tree dt;
    `,
      organizationId,
      userId,
      slugPath,
    );

    if (!result || result.length === 0) {
      throw new BadRequestException('Você não tem acesso a esta categoria');
    }

    const pathRaw = result.find((r: any) => r.type === 'path')?.data || [];
    const treeRaw = result.find((r: any) => r.type === 'tree')?.data || [];

    // 🧠 Ordenar breadcrumb (root → leaf)
    const path = this.buildPath(pathRaw);

    // 🌳 Montar árvore hierárquica
    const tree = this.buildTree(treeRaw);

    return {
      path,
      tree,
    };
  }

  async findSiblingByOrder(
    order: number,
    organizationId: string,
    parentId: string | null,
    excludeId?: string,
  ): Promise<{ id: string; order: number } | null> {
    try {
      return await this.prisma.category.findFirst({
        where: {
          organizationId,
          order,
          parentId,
          isDeleted: false,
          ...(excludeId && { id: { not: excludeId } }),
        },
        select: {
          id: true,
          order: true,
        },
      });
    } catch (error) {
      void this.logger.error('CategoryRepository.findSiblingByOrder falhou', {
        error: String(error),
        order,
        organizationId,
        parentId,
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
    data: CreateCategoryDTO & { slug: string; slugPath: string },
    userId: string,
  ): Promise<{ id: string }> {
    try {
      const id = generateId();

      await this.prisma.category.create({
        data: {
          id,
          organizationId,
          name: data.name,
          slug: data.slug,
          slugPath: data.slugPath,
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

      return { id };
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
    data: UpdateCategoryDTO & { slugPath?: string },
    userId: string,
  ): Promise<void> {
    try {
      const { slugPath, ...updateData } = data;

      await this.prisma.$transaction(async (tx) => {
        await tx.category.update({
          where: {
            id,
            organizationId,
            isDeleted: false,
          },
          data: {
            ...(updateData.name !== undefined && { name: updateData.name }),
            ...(updateData.slug !== undefined && { slug: updateData.slug }),
            ...(updateData.order !== undefined && { order: updateData.order }),
            ...(updateData.isActive !== undefined && {
              isActive: updateData.isActive,
            }),
            ...(updateData.parentId !== undefined && {
              parentId: updateData.parentId,
            }),
            ...(slugPath !== undefined && { slugPath }),
          },
        });

        if (slugPath !== undefined) {
          await this.recalculateDescendantSlugPaths(
            tx,
            organizationId,
            id,
            slugPath,
          );
        }
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

  // Remoção lógica que desativa a categoria e todas as suas subcategorias
  async delete(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    try {
      // Para garantir a integridade da hierarquia, buscamos todas as categorias e identificamos quais precisam ser desativadas
      const hierarchy = await this.findHierarchyReferences(organizationId);
      const idsToDelete = new Set<string>([id]);

      // Usamos uma fila para percorrer a hierarquia e encontrar todas as subcategorias do item a ser deletado
      const queue = [id];

      while (queue.length > 0) {
        const currentId = queue.shift();

        if (!currentId) {
          continue;
        }

        // Para cada categoria na hierarquia, verificamos se ela é filha da categoria atual e ainda não foi marcada para deleção
        for (const category of hierarchy) {
          if (category.parentId !== currentId || idsToDelete.has(category.id)) {
            continue;
          }
          // Se for filha e ainda não estiver marcada, adicionamos à lista de deleção e à fila para verificar suas subcategorias
          idsToDelete.add(category.id);
          queue.push(category.id);
        }
      }

      // Realizamos a atualização em massa para marcar todas as categorias identificadas como deletadas
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

  private async recalculateDescendantSlugPaths(
    tx: Prisma.TransactionClient,
    organizationId: string,
    parentId: string,
    parentSlugPath: string,
  ): Promise<void> {
    const children = await tx.category.findMany({
      where: {
        organizationId,
        parentId,
        isDeleted: false,
      },
      select: {
        id: true,
        slug: true,
      },
    });

    for (const child of children) {
      const childSlugPath = `${parentSlugPath}/${child.slug}`;

      await tx.category.update({
        where: { id: child.id },
        data: { slugPath: childSlugPath },
      });

      await this.recalculateDescendantSlugPaths(
        tx,
        organizationId,
        child.id,
        childSlugPath,
      );
    }
  }

  private buildPath(nodes: any[]) {
    // cria mapa
    const map = new Map(nodes.map((n) => [n.id, n]));

    // encontra leaf (único que não é parent de ninguém)
    const parentIds = new Set(nodes.map((n) => n.parentId));
    let current = nodes.find((n) => !parentIds.has(n.id));

    const path = [];

    while (current) {
      path.unshift({
        id: current.id,
        name: current.name,
        slug: current.slug,
        slugPath: current.slugPath,
      });

      current = map.get(current.parentId);
    }

    return path;
  }

  private buildTree(nodes: any[]) {
    const map = new Map();

    // inicializa todos
    nodes.forEach((node) => {
      map.set(node.id, { ...node, children: [] });
    });

    let root = null;

    nodes.forEach((node) => {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId).children.push(map.get(node.id));
      } else {
        root = map.get(node.id);
      }
    });

    return root;
  }
}
