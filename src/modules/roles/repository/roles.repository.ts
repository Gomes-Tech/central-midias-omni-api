import { BadRequestException } from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Action } from '@prisma/client';
import {
  CreateRoleDTO,
  FindAllRolePermissionsFiltersDTO,
  FindAllRolesFiltersDTO,
  UpdateRoleDTO,
} from '../dto';
import { CreateGlobalRoleDTO } from '../dto/create-global-role.dto';
import { Role, RolePermissionListResponse } from '../entities';

@Injectable()
export class RolesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(
    filters: FindAllRolesFiltersDTO = {},
  ): Promise<Omit<Role, 'categoryRoleAccesses'>[]> {
    try {
      const roles = await this.prisma.role.findMany({
        where: { deletedAt: null },
        orderBy: [{ label: 'asc' }],
      });

      return roles;
    } catch (error) {
      this.handleError('RolesRepository.findAll falhou', error, { filters });
    }
  }

  async findAllPermissions(
    organizationId: string,
    filters: FindAllRolePermissionsFiltersDTO = {},
  ): Promise<RolePermissionListResponse> {
    const { page = 1, limit = 25, searchTerm } = filters;
    const skip = (page - 1) * limit;

    try {
      const where = {
        deletedAt: null,
        canAccessBackoffice: false,
        categoryRoleAccesses: {
          some: {
            organizationId,
          },
        },
        ...(searchTerm && {
          OR: [
            {
              label: {
                contains: searchTerm,
                mode: 'insensitive' as const,
              },
            },
            {
              name: {
                contains: searchTerm,
                mode: 'insensitive' as const,
              },
            },
          ],
        }),
      };

      const [data, total] = await Promise.all([
        this.prisma.role.findMany({
          where,
          select: {
            id: true,
            name: true,
            label: true,
            canHaveSubordinates: true,
            categoryRoleAccesses: {
              where: { organizationId },
              select: {
                id: true,
                categoryId: true,
                organizationId: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
              orderBy: [{ category: { name: 'asc' } }],
            },
          },
          orderBy: [{ label: 'asc' }],
          skip,
          take: limit,
        }),
        this.prisma.role.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.handleError('RolesRepository.findAllPermissions falhou', error, {
        organizationId,
        filters,
      });
    }
  }

  async findAllSelect(
    isMember: boolean = false,
  ): Promise<{ id: string; label: string }[]> {
    try {
      const roles = await this.prisma.role.findMany({
        where: { deletedAt: null, canAccessBackoffice: isMember },
        select: {
          id: true,
          label: true,
        },
        orderBy: [{ label: 'asc' }],
      });

      return roles;
    } catch (error) {
      this.handleError('RolesRepository.findAllSelect falhou', error);
    }
  }

  async findAllGlobalRolesSelect(): Promise<{ id: string; label: string }[]> {
    try {
      const roles = await this.prisma.role.findMany({
        where: { deletedAt: null, canAccessBackoffice: true },
        select: { id: true, label: true },
      });

      return roles;
    } catch (error) {
      this.handleError(
        'RolesRepository.findAllGlobalRolesSelect falhou',
        error,
      );
    }
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<Omit<Role, 'createdAt' | 'updatedAt'> | null> {
    try {
      const role = await this.prisma.role.findFirst({
        where: {
          id,
          deletedAt: null,
          categoryRoleAccesses: { some: { organizationId } },
        },
        select: {
          id: true,
          label: true,
          name: true,
          isSystem: true,
          canAccessBackoffice: true,
          canHaveSubordinates: true,
          categoryRoleAccesses: {
            where: { organizationId },
            select: {
              id: true,
              categoryId: true,
              organizationId: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
            orderBy: [{ category: { name: 'asc' } }],
          },
        },
      });

      return role;
    } catch (error) {
      this.handleError('RolesRepository.findById falhou', error, {
        id,
        organizationId,
      });
    }
  }

  async findByName(
    name: string,
  ): Promise<Omit<Role, 'categoryRoleAccesses'> | null> {
    try {
      const role = await this.prisma.role.findFirst({
        where: {
          name,
          deletedAt: null,
        },
      });

      return role;
    } catch (error) {
      this.handleError('RolesRepository.findByCode falhou', error, {
        name,
      });
    }
  }

  async findByCodes(
    roleCodes: string[],
  ): Promise<Omit<Role, 'categoryRoleAccesses'>[]> {
    try {
      if (!roleCodes.length) {
        return [];
      }

      const roles = await this.prisma.role.findMany({
        where: {
          name: {
            in: [...new Set(roleCodes)],
          },
          deletedAt: null,
        },
      });

      return roles;
    } catch (error) {
      this.handleError('RolesRepository.findByCodes falhou', error, {
        roleCodes,
      });
    }
  }

  async findCanAccessBackofficeByUserId(userId: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          isActive: true,
          isDeleted: false,
        },
        select: {
          globalRole: {
            select: {
              canAccessBackoffice: true,
            },
          },
          members: {
            select: {
              role: {
                select: {
                  canAccessBackoffice: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        return false;
      }

      if (user.globalRole?.canAccessBackoffice) {
        return true;
      }

      return user.members.some((member) => member.role.canAccessBackoffice);
    } catch (error) {
      this.handleError(
        'RolesRepository.findCanAccessBackofficeByUserId falhou',
        error,
        {
          userId,
        },
      );
    }
  }

  async create(data: CreateRoleDTO): Promise<{ id: string; name: string }> {
    try {
      const role = await this.prisma.role.create({
        data: {
          id: generateId(),
          label: data.label,
          name: data.name,
          canHaveSubordinates: data.canHaveSubordinates,
        },
        select: {
          id: true,
          name: true,
        },
      });

      void this.logger.info('Perfil criado', {
        roleId: role.id,
        role: role.name,
      });

      return role;
    } catch (error) {
      this.handleError('RolesRepository.create falhou', error, {
        role: data.name,
      });
    }
  }

  async createGlobalRole(data: CreateGlobalRoleDTO): Promise<void> {
    try {
      const role = await this.prisma.$transaction(async (tx) => {
        const role = await tx.role.create({
          data: {
            id: generateId(),
            label: data.label,
            name: data.name,
            canAccessBackoffice: true,
          },
          select: {
            id: true,
          },
        });

        const permissions = data.permissions.map((permission) => ({
          id: generateId(),
          roleId: role.id,
          moduleId: permission.moduleId,
          action: permission.action as Action,
        }));

        await tx.rolePermission.createMany({ data: permissions });

        return role;
      });

      void this.logger.info('Perfil global criado', {
        roleId: role.id,
      });
    } catch (error) {
      void this.logger.error('RolesRepository.createGlobalRole falhou', {
        error: String(error),
      });
      throw new BadRequestException('Erro ao criar perfil global');
    }
  }

  async update(
    id: string,
    data: UpdateRoleDTO,
  ): Promise<Omit<Role, 'categoryRoleAccesses'>> {
    try {
      const role = await this.prisma.role.update({
        where: { id },
        data: {
          ...(data.label !== undefined && { label: data.label }),
          ...(data.name !== undefined && { name: data.name }),
          ...(data.canAccessBackoffice !== undefined && {
            canAccessBackoffice: data.canAccessBackoffice,
          }),
          ...(data.canHaveSubordinates !== undefined && {
            canHaveSubordinates: data.canHaveSubordinates,
          }),
        },
      });

      void this.logger.info('Perfil atualizado', {
        roleId: id,
      });

      return role;
    } catch (error) {
      this.handleError('RolesRepository.update falhou', error, {
        roleId: id,
      });
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      await this.prisma.role.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      void this.logger.info('Perfil inativado', { roleId: id });
    } catch (error) {
      this.handleError('RolesRepository.softDelete falhou', error, {
        roleId: id,
      });
    }
  }

  private handleError(
    message: string,
    error: unknown,
    metadata?: object,
  ): never {
    if (error instanceof HttpException) {
      throw error;
    }

    void this.logger.error(message, {
      ...metadata,
      error: String(error),
    });

    throw new InternalServerErrorException(error);
  }
}
