import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateCategoryRoleAccessDTO } from '../dto/create-category-role-access.dto';

export type CategoryRoleAccessWithRelations =
  Prisma.CategoryRoleAccessGetPayload<{
    include: {
      category: { select: { id: true; name: true; slug: true } };
      role: { select: { id: true; name: true; label: true } };
    };
  }>;

@Injectable()
export class CategoryRoleAccessRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findActiveCategoryInOrganization(
    categoryId: string,
    organizationId: string,
  ): Promise<{ id: string } | null> {
    try {
      return await this.prisma.category.findFirst({
        where: {
          id: categoryId,
          organizationId,
          isDeleted: false,
        },
        select: { id: true },
      });
    } catch (error) {
      void this.logger.error(
        'CategoryRoleAccessRepository.findActiveCategoryInOrganization falhou',
        {
          error: String(error),
          categoryId,
          organizationId,
        },
      );

      throw new BadRequestException('Erro ao buscar categoria');
    }
  }

  async findActiveRole(roleId: string): Promise<{ id: string } | null> {
    try {
      return await this.prisma.role.findFirst({
        where: {
          id: roleId,
          deletedAt: null,
        },
        select: { id: true },
      });
    } catch (error) {
      void this.logger.error(
        'CategoryRoleAccessRepository.findActiveRole falhou',
        {
          error: String(error),
          roleId,
        },
      );

      throw new BadRequestException('Erro ao buscar perfil');
    }
  }

  async findByCategoryRoleAndOrganization(
    categoryId: string,
    roleId: string,
    organizationId: string,
  ): Promise<{ id: string } | null> {
    try {
      return await this.prisma.categoryRoleAccess.findFirst({
        where: {
          categoryId,
          roleId,
          organizationId,
        },
        select: { id: true },
      });
    } catch (error) {
      void this.logger.error(
        'CategoryRoleAccessRepository.findByCategoryRoleAndOrganization falhou',
        {
          error: String(error),
          categoryId,
          roleId,
          organizationId,
        },
      );

      throw new BadRequestException('Erro ao verificar vínculo');
    }
  }

  async create(
    organizationId: string,
    data: CreateCategoryRoleAccessDTO,
  ): Promise<CategoryRoleAccessWithRelations> {
    try {
      return await this.prisma.categoryRoleAccess.create({
        data: {
          categoryId: data.categoryId,
          roleId: data.roleId,
          organizationId,
        },
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          role: {
            select: { id: true, name: true, label: true },
          },
        },
      });
    } catch (error) {
      void this.logger.error('CategoryRoleAccessRepository.create falhou', {
        error: String(error),
        organizationId,
        data,
      });

      throw new BadRequestException('Erro ao criar vínculo');
    }
  }

  async findByIdAndOrganization(
    id: string,
    organizationId: string,
  ): Promise<{ id: string } | null> {
    try {
      return await this.prisma.categoryRoleAccess.findFirst({
        where: { id, organizationId },
        select: { id: true },
      });
    } catch (error) {
      void this.logger.error(
        'CategoryRoleAccessRepository.findByIdAndOrganization falhou',
        {
          error: String(error),
          id,
          organizationId,
        },
      );

      throw new BadRequestException('Erro ao buscar vínculo');
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      await this.prisma.categoryRoleAccess.delete({
        where: { id },
      });
    } catch (error) {
      void this.logger.error('CategoryRoleAccessRepository.deleteById falhou', {
        error: String(error),
        id,
      });

      throw new BadRequestException('Erro ao remover vínculo');
    }
  }

  async findAllByOrganization(organizationId: string) {
    try {
      return await this.prisma.categoryRoleAccess.findMany({
        where: { organizationId },
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          role: {
            select: { id: true, name: true, label: true },
          },
        },
        orderBy: [{ category: { name: 'asc' } }, { role: { name: 'asc' } }],
      });
    } catch (error) {
      void this.logger.error(
        'CategoryRoleAccessRepository.findAllByOrganization falhou',
        {
          error: String(error),
          organizationId,
        },
      );

      throw new BadRequestException('Erro ao listar vínculos');
    }
  }

  async findRoleIdsByCategoryAndOrganization(
    categoryId: string,
    organizationId: string,
  ): Promise<string[]> {
    try {
      const rows = await this.prisma.categoryRoleAccess.findMany({
        where: { categoryId, organizationId },
        select: { roleId: true },
      });

      return rows.map((r) => r.roleId);
    } catch (error) {
      void this.logger.error(
        'CategoryRoleAccessRepository.findRoleIdsByCategoryAndOrganization falhou',
        {
          error: String(error),
          categoryId,
          organizationId,
        },
      );

      throw new BadRequestException('Erro ao buscar acessos da categoria');
    }
  }

  async findRolesByIds(
    ids: string[],
  ): Promise<{ id: string; name: string; label: string }[]> {
    if (ids.length === 0) {
      return [];
    }

    try {
      return await this.prisma.role.findMany({
        where: {
          id: { in: ids },
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          label: true,
        },
        orderBy: [{ label: 'asc' }],
      });
    } catch (error) {
      void this.logger.error(
        'CategoryRoleAccessRepository.findRolesByIds falhou',
        {
          error: String(error),
          ids,
        },
      );

      throw new BadRequestException('Erro ao buscar perfis');
    }
  }
}
